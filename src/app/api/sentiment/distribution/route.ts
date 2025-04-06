import { NextResponse } from 'next/server';
import { kv } from "@vercel/kv"; 
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

// Constants (centralize these later)
const ATHENA_DB = "sentimental";
const ATHENA_TABLE = "sentiment";
const ATHENA_OUTPUT_LOCATION = "s3://tcd93-sentimental-bucket/athena-results/web"; 
const AWS_REGION = "ap-southeast-1"; 
const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

const athenaClient = new AthenaClient({ region: AWS_REGION });
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define interface for the expected data structure
interface SentimentDistributionPoint {
  sentiment: string;
  count: number;
}

// Helper function to parse Athena results for distribution
const parseAthenaDistributionResults = (results: GetQueryResultsCommandOutput): SentimentDistributionPoint[] => {
    const rows = results.ResultSet?.Rows ?? [];
    if (rows.length < 2) return []; 

    const columns = rows[0].Data?.map((datum: AthenaSDKDatum) => datum.VarCharValue ?? 'unknown') ?? [];
    const sentimentColIndex = columns.indexOf('sentiment');
    const countColIndex = columns.indexOf('count');

    if (sentimentColIndex === -1 || countColIndex === -1) {
        console.error("Required columns ('sentiment', 'count') not found in Athena results.");
        return [];
    }

    const data = rows.slice(1).map((row: AthenaSDKRow) => {
        const sentiment = row.Data?.[sentimentColIndex]?.VarCharValue ?? 'UNKNOWN';
        const countStr = row.Data?.[countColIndex]?.VarCharValue ?? '0';
        const count = parseInt(countStr, 10); 
        return { sentiment, count: !isNaN(count) ? count : 0 };
    });

    // Filter out any entries with zero count if necessary (usually handled by query)
    return data.filter(d => d.count > 0);
};


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const startDate = searchParams.get('startDate'); 
    const endDate = searchParams.get('endDate');     

    if (!keyword) {
        return NextResponse.json({ error: "Missing required query parameter: keyword" }, { status: 400 });
    }

    // Strict Date Validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return NextResponse.json({ error: "Missing or invalid required query parameters: startDate and endDate must be in YYYY-MM-DD format" }, { status: 400 });
    }
    if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json({ error: "Invalid date range: startDate cannot be after endDate" }, { status: 400 });
    }

    // Fix regex for normalizing keyword
    const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '-');
    const cacheKey = `distribution:${normalizedKeyword}-from${startDate}-to${endDate}`;

    try {
        // --- Check Cache First ---
        const cachedData = await kv.get<SentimentDistributionPoint[]>(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return NextResponse.json({ data: cachedData });
        }
        console.log(`Cache miss for key: ${cacheKey}`);

        // --- If Cache Miss, Query Athena ---
        const query = `
        SELECT 
            sentiment,
            count(1) as count
        FROM 
            "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE 
            keyword = ? 
            AND CAST(created_at AS DATE) >= date('${startDate}') 
            AND CAST(created_at AS DATE) <= date('${endDate}')
        GROUP BY 
            1 
        ORDER BY
            count DESC; 
    `;

        const startQueryCmd = new StartQueryExecutionCommand({
            QueryString: query,
            QueryExecutionContext: { Database: ATHENA_DB },
            ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
            ExecutionParameters: [keyword] // Only keyword is parameter
        });

        const { QueryExecutionId } = await athenaClient.send(startQueryCmd);

        if (!QueryExecutionId) {
            throw new Error("Failed to start query execution.");
        }

        // --- Poll for results ---
        let status: QueryExecutionState | string | undefined;
        let attempts = 0;
        const maxAttempts = 10; 
        const pollInterval = 3000;

        while (attempts < maxAttempts) {
            const getQueryExecutionCmd = new GetQueryExecutionCommand({ QueryExecutionId });
            const { QueryExecution } = await athenaClient.send(getQueryExecutionCmd);
            status = QueryExecution?.Status?.State;

            if (status === QueryExecutionState.SUCCEEDED) break;
            if (status === QueryExecutionState.FAILED || status === QueryExecutionState.CANCELLED) {
                throw new Error(`Query ${QueryExecutionId} failed/cancelled. State: ${status}. Reason: ${QueryExecution?.Status?.StateChangeReason}`);
            }
            attempts++;
            await delay(pollInterval);
        }

        if (status !== QueryExecutionState.SUCCEEDED) {
             throw new Error(`Query ${QueryExecutionId} did not complete successfully. Final state: ${status}`);
        }

        // --- Fetch and Parse Results ---
        const getQueryResultsCmd = new GetQueryResultsCommand({ QueryExecutionId });
        const results = await athenaClient.send(getQueryResultsCmd);
        const parsedData = parseAthenaDistributionResults(results);

        // --- Store Result in Cache --- 
        if (Array.isArray(parsedData)) { // Check if it's an array (even empty)
             // Cache even empty results for a short time to prevent hammering
            const ttl = parsedData.length > 0 ? CACHE_TTL_SECONDS : 60 * 15; // 15 min TTL for empty results
            await kv.set(cacheKey, parsedData, { ex: ttl });
            console.log(`Cached result (TTL: ${ttl}s) for key: ${cacheKey}`);
        }

        return NextResponse.json({ data: parsedData });

    } catch (error) {
        console.error("Athena Distribution Query Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ error: "Failed to query Athena for sentiment distribution", details: errorMessage }, { status: 500 });
    }
} 