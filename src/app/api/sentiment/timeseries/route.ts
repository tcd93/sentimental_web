import { NextResponse } from 'next/server';
import { kv } from "@vercel/kv";
import { 
    StartQueryExecutionCommand, 
    GetQueryExecutionCommand, 
    GetQueryResultsCommand, 
    QueryExecutionState,
    type GetQueryResultsCommandOutput,
    type Row as AthenaSDKRow,
    type Datum as AthenaSDKDatum
} from "@aws-sdk/client-athena";
// Import shared config and clients
import {
    ATHENA_DB, ATHENA_TABLE, ATHENA_OUTPUT_LOCATION, 
    CACHE_TTL_SECONDS, CACHE_TTL_EMPTY_SECONDS,
    ATHENA_POLL_INTERVAL_MS, ATHENA_MAX_POLL_ATTEMPTS
} from '@/lib/config';
import { athenaClient, delay } from '@/lib/awsClients';

// Define interface for parsed data points
interface TimeseriesDataPoint {
    day: string; // Expect day to be a string like 'YYYY-MM-DD'
    avg_pos?: number | null;
    avg_neg?: number | null;
    avg_mix?: number | null;
    avg_neutral?: number | null;
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
            } else if ([ 'avg_pos', 'avg_neg', 'avg_mix', 'avg_neutral', 'count' ].includes(colName)) {
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
    const startDate = searchParams.get('startDate'); 
    const endDate = searchParams.get('endDate');     
    const minCount = parseInt(searchParams.get('minCountPerDay') || '10', 10);

    if (!keyword) {
        return NextResponse.json({ error: "Missing required query parameter: keyword" }, { status: 400 });
    }

    // --- Strict Date Validation ---
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return NextResponse.json({ error: "Missing or invalid required query parameters: startDate and endDate must be in YYYY-MM-DD format" }, { status: 400 });
    }
    // Simple validation to prevent clearly invalid ranges (optional but good practice)
    if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json({ error: "Invalid date range: startDate cannot be after endDate" }, { status: 400 });
    }
    // --- End Date Validation ---

    const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '-');
    const cacheKey = `timeseries-v2:${normalizedKeyword}-from${startDate}-to${endDate}-mc${minCount}`;

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
            avg(sentiment_score_neutral) AS avg_neutral,
            count(1) AS count
        FROM 
            "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE 
            keyword = ? 
            AND CAST(created_at AS DATE) >= date('${startDate}') -- Interpolate validated start date
            AND CAST(created_at AS DATE) <= date('${endDate}') -- Interpolate validated end date
        GROUP BY 
            1 
        HAVING
            count(1) >= ${minCount} 
        ORDER BY 
            day ASC;
    `;

        const startQueryCmd = new StartQueryExecutionCommand({
            QueryString: query,
            QueryExecutionContext: { Database: ATHENA_DB },
            ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
            ExecutionParameters: [keyword]
        });

        const { QueryExecutionId } = await athenaClient.send(startQueryCmd);

        if (!QueryExecutionId) {
            throw new Error("Failed to start query execution.");
        }

        let status: QueryExecutionState | string | undefined;
        let attempts = 0;
        const maxAttempts = ATHENA_MAX_POLL_ATTEMPTS;
        const pollInterval = ATHENA_POLL_INTERVAL_MS;

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
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            const ttl = parsedData.length > 0 ? CACHE_TTL_SECONDS : CACHE_TTL_EMPTY_SECONDS;
            await kv.set(cacheKey, parsedData, { ex: ttl });
            console.log(`Cached result (TTL: ${ttl}s) for key: ${cacheKey}`);
        } else if (Array.isArray(parsedData) && parsedData.length === 0) {
            console.log(`No data found for key: ${cacheKey}. Not caching empty result.`);
        }

        return NextResponse.json({ data: parsedData });

    } catch (error) {
        console.error("Athena Timeseries Query Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ error: "Failed to query Athena for timeseries", details: errorMessage }, { status: 500 });
    }
} 