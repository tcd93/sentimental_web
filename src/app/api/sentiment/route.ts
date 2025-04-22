import { NextResponse } from 'next/server';
import { kv } from "@vercel/kv"; // Import Vercel KV client
import { 
    StartQueryExecutionCommand, 
    GetQueryExecutionCommand, 
    GetQueryResultsCommand, 
    QueryExecutionState,
    type GetQueryResultsCommandOutput
} from "@aws-sdk/client-athena";
// Import shared config and clients
import {
    ATHENA_DB, ATHENA_TABLE, ATHENA_OUTPUT_LOCATION, 
    CACHE_TTL_SECONDS, CACHE_TTL_EMPTY_SECONDS,
    ATHENA_POLL_INTERVAL_MS, ATHENA_MAX_POLL_ATTEMPTS // <-- Import new constants
} from '@/lib/config';
import { athenaClient, delay } from '@/lib/awsClients';
import { SentimentSummary, SentimentSummarySchema } from '@/lib/types/sentiment';

// Helper function to parse Athena results using SDK types
const parseAthenaResults = (results: GetQueryResultsCommandOutput): SentimentSummary[] => {
    const rows = results.ResultSet?.Rows ?? [];
    if (rows.length < 2) {
        return [];
    }
    
    const columns = rows[0].Data?.map((datum) => datum.VarCharValue) ?? [];
    
    const data = rows.slice(1).map((row) => {
        const parsed_row = row.Data?.reduce((obj, field, i) => {
            const key = columns[i] as keyof SentimentSummary;
            const value = field.VarCharValue;

            switch (key) {
                case 'keyword':
                    obj[key] = value;
                    break;
                case 'avg_pos':
                case 'avg_neg':
                case 'avg_mix':
                case 'avg_neutral':
                    obj[key] = value !== undefined ? Number(value) : null;
                    break;
                case 'count':
                    obj[key] = Number(value);
                    break;
            }
            return obj;
        }, {} as Partial<SentimentSummary>);
        
        return SentimentSummarySchema.parse(parsed_row);
    });

    return data;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') === 'avg_pos' ? 'avg_pos' : 'avg_neg';
    const order = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
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

    // Use imported config for cache key generation
    let cacheKey = `sentiment-summary-v2:${metric}-${order}-l${limit}-from${startDate}-to${endDate}`;
    if (specificKeyword) {
        const normalizedKeyword = specificKeyword.toLowerCase().replace(/\s+/g, '-');
        cacheKey += `-k${normalizedKeyword}`;
    }

    try {
        // --- Check Cache First ---
        const cachedData = await kv.get<SentimentSummary[]>(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return NextResponse.json({ data: cachedData });
        }
        console.log(`Cache miss for key: ${cacheKey}`);

        // --- Query Athena ---
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
            count(1) > 20
        ORDER BY 
            ${orderByMetric} ${order}
        LIMIT ${limit};
    `;

        const startQueryCmd = new StartQueryExecutionCommand({
            QueryString: query,
            QueryExecutionContext: { Database: ATHENA_DB },
            ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
        });

        // Use imported client
        const { QueryExecutionId } = await athenaClient.send(startQueryCmd);

        if (!QueryExecutionId) {
            throw new Error("Failed to start query execution.");
        }

        let status: QueryExecutionState | string | undefined;
        let attempts = 0;
        // Use imported constants for polling loop
        const maxAttempts = ATHENA_MAX_POLL_ATTEMPTS;
        const pollInterval = ATHENA_POLL_INTERVAL_MS;

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
        if (Array.isArray(parsedData)) {
            // Use imported TTL constants
            const ttl = parsedData.length > 0 ? CACHE_TTL_SECONDS : CACHE_TTL_EMPTY_SECONDS;
            await kv.set(cacheKey, parsedData, { ex: ttl });
            console.log(`Cached result (TTL: ${ttl}s) for key: ${cacheKey}`);
        }

        return NextResponse.json({ data: parsedData });

    } catch (error) {
        console.error("Athena Query Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        // Don't cache errors
        return NextResponse.json({ error: "Failed to query Athena", details: errorMessage }, { status: 500 });
    }
}