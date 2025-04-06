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

// Constants (reuse or centralize later if needed)
const ATHENA_DB = "sentimental";
const ATHENA_TABLE = "sentiment";
const ATHENA_OUTPUT_LOCATION = "s3://tcd93-sentimental-bucket/athena-results/web";
const AWS_REGION = "ap-southeast-1";

const athenaClient = new AthenaClient({ region: AWS_REGION });
const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define interface for parsed data points
interface TimeseriesDataPoint {
    day: string; // Expect day to be a string like 'YYYY-MM-DD'
    avg_pos?: number | null;
    avg_neg?: number | null;
    avg_mix?: number | null;
    count?: number | null;
}

// Helper function to parse Athena timeseries results using SDK types
const parseAthenaTimeseriesResults = (results: GetQueryResultsCommandOutput): TimeseriesDataPoint[] => {
    const rows = results.ResultSet?.Rows ?? [];
    if (rows.length < 2) {
        return []; // Need header + at least one data row
    }

    // Extract column names from header row
    const columns = rows[0].Data?.map((datum: AthenaSDKDatum) => datum.VarCharValue ?? 'unknown') ?? [];

    // Process data rows
    const data = rows.slice(1).map((row: AthenaSDKRow) => {
        const rowData: { [key: string]: string | number | null } = {}; 
        row.Data?.forEach((datum: AthenaSDKDatum, index: number) => {
            const colName = columns[index];
            if (!colName || colName === 'unknown') return;

            const rawValue = datum.VarCharValue;

            if (rawValue === undefined || rawValue === null) {
                rowData[colName] = null;
            } else if (colName === 'day') {
                rowData[colName] = rawValue; // Assign string
            } else if ([ 'avg_pos', 'avg_neg', 'avg_mix', 'count' ].includes(colName)) {
                // Assign number or null
                rowData[colName] = !isNaN(Number(rawValue)) ? Number(rawValue) : null;
            } else {
                rowData[colName] = rawValue; // Assign string
            }
        });
        // Assert via unknown first to handle the type mismatch safely
        return rowData as unknown as TimeseriesDataPoint; 
    });

    // Filter out any rows that might not conform fully after mapping (optional safety)
    const validData = data.filter((d): d is TimeseriesDataPoint => typeof d?.day === 'string');

    // Sort by date ascending
    return validData.sort((a: TimeseriesDataPoint, b: TimeseriesDataPoint) => {
        const dateA = new Date(a.day).getTime();
        const dateB = new Date(b.day).getTime();
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
    });
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const minCount = parseInt(searchParams.get('minCountPerDay') || '5', 10);

    if (!keyword) {
        return NextResponse.json({ error: "Missing required query parameter: keyword" }, { status: 400 });
    }

    // Define cache key based on parameters
    // Normalize keyword for cache key consistency (e.g., lowercase, replace spaces)
    const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '-');
    const cacheKey = `timeseries:${normalizedKeyword}-d${days}-mc${minCount}`;

    try {
        // --- Check Cache First ---
        const cachedData = await kv.get<TimeseriesDataPoint[]>(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return NextResponse.json({ data: cachedData });
        }
        console.log(`Cache miss for key: ${cacheKey}`);

        // --- If Cache Miss, Query Athena ---
        const query = `
        SELECT 
            CAST(date_trunc('day', created_at) AS DATE) AS day,
            avg(sentiment_score_positive) AS avg_pos, 
            avg(sentiment_score_negative) AS avg_neg, 
            avg(sentiment_score_mixed) AS avg_mix, 
            count(1) AS count
        FROM 
            "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE 
            keyword = ? 
            AND created_at >= current_timestamp - interval '${days}' day
        GROUP BY 
            1 
        HAVING
            count(1) >= ${minCount}
        ORDER BY 
            day ASC;
    `;

        // Use prepared statement parameters to prevent SQL injection
        const startQueryCmd = new StartQueryExecutionCommand({
            QueryString: query,
            QueryExecutionContext: { Database: ATHENA_DB },
            ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
            ExecutionParameters: [keyword] // Pass keyword as parameter
        });

        const { QueryExecutionId } = await athenaClient.send(startQueryCmd);

        if (!QueryExecutionId) {
            throw new Error("Failed to start query execution.");
        }

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

        const getQueryResultsCmd = new GetQueryResultsCommand({ QueryExecutionId });
        const results = await athenaClient.send(getQueryResultsCmd);
        const parsedData = parseAthenaTimeseriesResults(results);

        // --- Store Result in Cache ---
        // Ensure parsedData is an array before caching
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            await kv.set(cacheKey, parsedData, { ex: CACHE_TTL_SECONDS });
            console.log(`Cached result for key: ${cacheKey}`);
        } else if (Array.isArray(parsedData) && parsedData.length === 0) {
            // Optionally cache empty results for a shorter duration to avoid repeated failed lookups
            // await kv.set(cacheKey, [], { ex: 60 * 15 }); // Cache empty result for 15 mins
            console.log(`No data found for key: ${cacheKey}. Not caching empty result.`);
        }

        return NextResponse.json({ data: parsedData });

    } catch (error) {
        console.error("Athena Timeseries Query Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        // Don't cache errors
        return NextResponse.json({ error: "Failed to query Athena for timeseries", details: errorMessage }, { status: 500 });
    }
} 