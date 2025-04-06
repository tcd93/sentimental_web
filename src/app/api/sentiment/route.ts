import { NextResponse } from 'next/server';
import { kv } from "@vercel/kv"; // Import Vercel KV client
import { 
    AthenaClient, 
    StartQueryExecutionCommand, 
    GetQueryExecutionCommand, 
    GetQueryResultsCommand, 
    QueryExecutionState,
    type GetQueryResultsCommandOutput,
    type Row as AthenaSDKRow,
    type Datum as AthenaSDKDatum
} from "@aws-sdk/client-athena";

const ATHENA_DB = "sentimental";
const ATHENA_TABLE = "sentiment";
const ATHENA_OUTPUT_LOCATION = "s3://tcd93-sentimental-bucket/athena-results/web";
const AWS_REGION = "ap-southeast-1"; // Ensure this is correct

const athenaClient = new AthenaClient({ region: AWS_REGION });
const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define interface for the expected data structure
interface SentimentSummary {
  keyword: string;
  avg_pos: number | null; // Use null for potential DB nulls
  avg_neg: number | null;
  avg_mix: number | null;
  avg_neutral: number | null; // <-- Add neutral
  count: number;
}

// Helper function to parse Athena results using SDK types
const parseAthenaResults = (results: GetQueryResultsCommandOutput): SentimentSummary[] => {
    const rows = results.ResultSet?.Rows ?? [];
    if (rows.length < 2) {
        return [];
    }
    
    const columns = rows[0].Data?.map((datum: AthenaSDKDatum) => datum.VarCharValue ?? 'unknown') ?? [];
    
    const data = rows.slice(1).map((row: AthenaSDKRow) => {
        const rowData: Partial<SentimentSummary> & { keyword: string } = { keyword: '' }; // Initialize with partial type + keyword
        row.Data?.forEach((datum: AthenaSDKDatum, index: number) => {
            const colName = columns[index];
            if (!colName || colName === 'unknown') return; 

            const rawValue = datum.VarCharValue;

            if (colName === 'keyword') {
                rowData.keyword = rawValue ?? 'UNKNOWN';
            } else if ([ 'avg_pos', 'avg_neg', 'avg_mix', 'avg_neutral', 'count' ].includes(colName)) {
                const numValue = (rawValue !== undefined && rawValue !== null && !isNaN(Number(rawValue))) ? Number(rawValue) : null;
                // Assign to typed keys, handling potential nulls
                if (colName === 'count') {
                    rowData.count = numValue ?? 0;
                } else if (colName === 'avg_pos' || colName === 'avg_neg' || colName === 'avg_mix' || colName === 'avg_neutral') {
                    rowData[colName] = numValue; 
                }
            }
        });
        // Ensure all required fields are present, provide defaults if necessary
        return {
            keyword: rowData.keyword,
            avg_pos: rowData.avg_pos ?? null,
            avg_neg: rowData.avg_neg ?? null,
            avg_mix: rowData.avg_mix ?? null,
            avg_neutral: rowData.avg_neutral ?? null,
            count: rowData.count ?? 0,
        } as SentimentSummary;
    });
    return data.filter(d => d.keyword !== 'UNKNOWN'); // Filter out potential parse errors
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') === 'avg_pos' ? 'avg_pos' : 'avg_neg';
    const order = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const minCount = parseInt(searchParams.get('minCount') || '100', 10);
    const startDate = searchParams.get('startDate'); 
    const endDate = searchParams.get('endDate');
    const specificKeyword = searchParams.get('keyword'); // <-- Get specific keyword param

    // Get and validate date parameters
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        // Return error if dates are missing or invalid
        return NextResponse.json({ error: "Missing or invalid required query parameters: startDate and endDate must be in YYYY-MM-DD format" }, { status: 400 });
    }
    if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json({ error: "Invalid date range: startDate cannot be after endDate" }, { status: 400 });
    }

    // Validate metric
    const validMetrics = ['avg_pos', 'avg_neg', 'avg_mix', 'count', 'avg_neutral']; // Add neutral here
    const orderByMetric = validMetrics.includes(metric) ? metric : 'avg_neg';

    // Define cache key based on parameters, including dates and specific keyword if present
    let cacheKey = `sentiment-summary-v2:${metric}-${order}-l${limit}-from${startDate}-to${endDate}-m${minCount}`;
    if (specificKeyword) {
        const normalizedKeyword = specificKeyword.toLowerCase().replace(/\s+/g, '-');
        cacheKey += `-k${normalizedKeyword}`; // Add keyword to key
    }

    try {
        // --- Check Cache First ---
        const cachedData = await kv.get<SentimentSummary[]>(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return NextResponse.json({ data: cachedData });
        }
        console.log(`Cache miss for key: ${cacheKey}`);

        // --- If Cache Miss, Query Athena ---
        const whereClauses = [
            `CAST(created_at AS DATE) >= date('${startDate}')`,
            `CAST(created_at AS DATE) <= date('${endDate}')`
        ];
        // Add keyword filter if provided
        if (specificKeyword) {
            const escapedKeyword = specificKeyword.replace(/'/g, "''"); 
            whereClauses.push(`keyword = '${escapedKeyword}'`);
        }
        
        const query = `
        SELECT 
            keyword,
            avg(sentiment_score_positive) AS avg_pos, 
            avg(sentiment_score_negative) AS avg_neg, 
            avg(sentiment_score_mixed) AS avg_mix, 
            avg(sentiment_score_neutral) AS avg_neutral,
            count(1) AS count
        FROM 
            "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE 
            ${whereClauses.join(' AND \n            ')}
        GROUP BY 
            keyword
        HAVING 
            count(1) >= ${minCount} 
        ORDER BY 
            ${orderByMetric} ${order}
        LIMIT ${limit};
    `;

        const startQueryCmd = new StartQueryExecutionCommand({
            QueryString: query,
            QueryExecutionContext: { Database: ATHENA_DB },
            ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
        });

        const { QueryExecutionId } = await athenaClient.send(startQueryCmd);

        if (!QueryExecutionId) {
            throw new Error("Failed to start query execution.");
        }

        let status: QueryExecutionState | string | undefined;
        let attempts = 0;
        const maxAttempts = 10; // Poll for ~30 seconds max (adjust as needed)
        const pollInterval = 3000; // 3 seconds

        while (attempts < maxAttempts) {
            const getQueryExecutionCmd = new GetQueryExecutionCommand({ QueryExecutionId });
            const { QueryExecution } = await athenaClient.send(getQueryExecutionCmd);
            
            status = QueryExecution?.Status?.State;

            if (status === QueryExecutionState.SUCCEEDED) {
                break; // Query succeeded
            } else if (status === QueryExecutionState.FAILED || status === QueryExecutionState.CANCELLED) {
                throw new Error(`Query ${QueryExecutionId} failed or was cancelled. State: ${status}. Reason: ${QueryExecution?.Status?.StateChangeReason}`);
            }

            attempts++;
            await delay(pollInterval);
        }

        if (status !== QueryExecutionState.SUCCEEDED) {
             throw new Error(`Query ${QueryExecutionId} did not complete successfully after ${attempts} attempts. Final state: ${status}`);
        }

        // Fetch results
        const getQueryResultsCmd = new GetQueryResultsCommand({ QueryExecutionId });
        const results = await athenaClient.send(getQueryResultsCmd);

        const parsedData = parseAthenaResults(results);

        // --- Store Result in Cache ---
        // Ensure parsedData is an array before caching
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            await kv.set(cacheKey, parsedData, { ex: CACHE_TTL_SECONDS });
            console.log(`Cached result for key: ${cacheKey}`);
        }

        return NextResponse.json({ data: parsedData });

    } catch (error) {
        console.error("Athena Query Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        // Don't cache errors
        return NextResponse.json({ error: "Failed to query Athena", details: errorMessage }, { status: 500 });
    }
} 