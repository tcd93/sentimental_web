import { NextResponse } from 'next/server';
import { kv } from "@vercel/kv";
import {
    StartQueryExecutionCommand,
    GetQueryExecutionCommand,
    GetQueryResultsCommand,
    QueryExecutionState,
    type GetQueryResultsCommandOutput
} from "@aws-sdk/client-athena";
import { z } from "zod";
// Import shared config and clients
import {
    ATHENA_DB, ATHENA_TABLE, ATHENA_OUTPUT_LOCATION,
    CACHE_TTL_SECONDS, CACHE_TTL_EMPTY_SECONDS,
    ATHENA_POLL_INTERVAL_MS, ATHENA_MAX_POLL_ATTEMPTS
} from '@/lib/config';
import { athenaClient, delay } from '@/lib/awsClients';

// Define Zod schema for the data structure
const SentimentDistributionPointSchema = z.object({
    sentiment: z.string(),
    count: z.number()
});

type SentimentDistributionPoint = z.infer<typeof SentimentDistributionPointSchema>;

const parseAthenaDistributionResults = (results: GetQueryResultsCommandOutput): SentimentDistributionPoint[] => {
    const rows = results.ResultSet?.Rows ?? [];
    if (rows.length < 2) return [];

    const columns = rows[0].Data?.map((datum) => datum.VarCharValue) ?? [];

    const data = rows.slice(1).map((row) => {
        const parsed_row = row.Data?.reduce((obj, field, i) => {
            const key = columns[i] as keyof SentimentDistributionPoint;
            const value = field.VarCharValue;
            
            switch (key) {
                case 'sentiment':
                    obj[key] = value;
                    break;
                case 'count':
                    obj[key] = Number(value);
                    break;
            }
            return obj;
        }, {} as Partial<SentimentDistributionPoint>);
        return SentimentDistributionPointSchema.parse(parsed_row);
    });

    return data.filter((d) => d.count > 0);
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

        // --- Fetch and Parse Results ---
        const getQueryResultsCmd = new GetQueryResultsCommand({ QueryExecutionId });
        const results = await athenaClient.send(getQueryResultsCmd);
        const parsedData = parseAthenaDistributionResults(results);

        // --- Store Result in Cache --- 
        if (Array.isArray(parsedData)) { // Check if it's an array (even empty)
            // Cache even empty results for a short time to prevent hammering
            const ttl = parsedData.length > 0 ? CACHE_TTL_SECONDS : CACHE_TTL_EMPTY_SECONDS;
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