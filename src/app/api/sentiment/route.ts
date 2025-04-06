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

// Helper function to parse Athena results using SDK types
const parseAthenaResults = (results: GetQueryResultsCommandOutput) => {
    const rows = results.ResultSet?.Rows ?? [];
    if (rows.length < 2) {
        return []; // Need header + at least one data row
    }
    
    // Extract column names from header row
    const columns = rows[0].Data?.map((datum: AthenaSDKDatum) => datum.VarCharValue ?? 'unknown') ?? [];
    
    // Process data rows
    const data = rows.slice(1).map((row: AthenaSDKRow) => {
        const rowData: { [key: string]: string | number | boolean | null } = {};
        row.Data?.forEach((datum: AthenaSDKDatum, index: number) => {
            const columnName = columns[index];
            if (!columnName || columnName === 'unknown') return; // Skip if column name is missing

            const rawValue = datum.VarCharValue;

            // Basic type inference - reuse existing logic
            if (rawValue === undefined || rawValue === null) {
                rowData[columnName] = null;
            } else if (!isNaN(Number(rawValue))) {
                rowData[columnName] = Number(rawValue);
            } else if (rawValue.toLowerCase() === 'true' || rawValue.toLowerCase() === 'false') {
                rowData[columnName] = rawValue.toLowerCase() === 'true';
            } else {
                rowData[columnName] = rawValue;
            }
        });
        return rowData;
    });
    return data;
};

// Define interface for the expected data structure
interface SentimentSummary {
  keyword: string;
  avg_pos: number;
  avg_neg: number;
  avg_mix: number;
  count: number;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    // Get sorting parameters from URL, default to top negative
    const metric = searchParams.get('metric') === 'avg_pos' ? 'avg_pos' : 'avg_neg';
    const order = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const minCount = parseInt(searchParams.get('minCount') || '100', 10);

    // Validate metric
    const validMetrics = ['avg_pos', 'avg_neg', 'avg_mix', 'count'];
    const orderByMetric = validMetrics.includes(metric) ? metric : 'avg_neg';

    // Define cache key based on parameters
    const cacheKey = `sentiment-summary:${metric}-${order}-l${limit}-d${days}-m${minCount}`;

    try {
        // --- Check Cache First ---
        const cachedData = await kv.get<SentimentSummary[]>(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return NextResponse.json({ data: cachedData });
        }
        console.log(`Cache miss for key: ${cacheKey}`);

        // --- If Cache Miss, Query Athena ---
        const query = `
        SELECT 
            keyword,
            avg(sentiment_score_positive) AS avg_pos, 
            avg(sentiment_score_negative) AS avg_neg, 
            avg(sentiment_score_mixed) AS avg_mix, 
            count(1) AS count
        FROM 
            "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE 
            created_at >= current_timestamp - interval '${days}' day
        GROUP BY 
            keyword
        HAVING 
            count(1) >= ${minCount} -- Use minCount parameter
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