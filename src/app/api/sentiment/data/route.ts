import { kv } from "@vercel/kv";
import {
    StartQueryExecutionCommand,
    GetQueryExecutionCommand,
    GetQueryResultsCommand,
    QueryExecutionState,
    type GetQueryResultsCommandOutput
} from "@aws-sdk/client-athena";
import {
    ATHENA_DB, ATHENA_TABLE, ATHENA_OUTPUT_LOCATION,
    CACHE_TTL_SECONDS, CACHE_TTL_EMPTY_SECONDS,
    ATHENA_POLL_INTERVAL_MS, ATHENA_MAX_POLL_ATTEMPTS
} from '@/lib/config';
import { athenaClient, delay } from '@/lib/awsClients';
import { DailySentimentData, DailySentimentDataSchema } from '@/lib/types/sentiment'; // Correct type import
import { jsonResponse } from '../../response';

// Helper function to parse Athena results for daily data
const parseAthenaDailyResults = (results: GetQueryResultsCommandOutput): DailySentimentData[] => {
    const rows = results.ResultSet?.Rows ?? [];
    if (rows.length < 2) {
        return []; // No data rows
    }

    const columns = rows[0].Data?.map((datum) => datum.VarCharValue) ?? [];

    const data = rows.slice(1).map((row) => {
        // Initialize parsed_row with a default structure or null
        const parsed_row = row.Data?.reduce((obj, field, i) => {
            const key = columns[i];
            const value = field.VarCharValue;

            switch (key) {
                case 'keyword':
                    obj.keyword = value;
                    break;
                case 'date':
                    obj.date = value;
                    break;
                case 'avg_pos':
                case 'avg_neg':
                case 'avg_mix':
                case 'avg_neutral':
                    obj[key as keyof Omit<DailySentimentData, 'keyword' | 'date' | 'count'>] = value !== undefined ? Number(value) : null;
                    break;
                case 'count':
                    obj.count = value !== undefined ? Number(value) : 0;
                    break;
            }
            return obj;
        }, {} as Partial<DailySentimentData>);

        // Check if parsed_row is valid before proceeding
        if (!parsed_row) {
            console.warn("Skipping row due to undefined row data.");
            return null;
        }

        if (parsed_row.keyword && parsed_row.date && parsed_row.count !== undefined) {
            try {
                // Explicitly provide default nulls for optional numeric fields if needed by schema
                 const complete_row: DailySentimentData = {
                     keyword: parsed_row.keyword,
                     date: parsed_row.date,
                     avg_pos: parsed_row.avg_pos ?? null,
                     avg_neg: parsed_row.avg_neg ?? null,
                     avg_mix: parsed_row.avg_mix ?? null,
                     avg_neutral: parsed_row.avg_neutral ?? null,
                     count: parsed_row.count,
                 };
                 return DailySentimentDataSchema.parse(complete_row);
            } catch (error) {
                console.warn(`Skipping row due to Zod validation error: ${error}. Row data:`, parsed_row);
                return null;
            }
        } else {
            console.warn("Skipping row due to missing required fields:", parsed_row);
            return null;
        }
    }).filter((item): item is DailySentimentData => item !== null);

    return data;
};


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return jsonResponse({ error: "Missing or invalid required query parameters: startDate and endDate must be in YYYY-MM-DD format" }, 400);
    }
    if (new Date(startDate) > new Date(endDate)) {
        return jsonResponse({ error: "Invalid date range: startDate cannot be after endDate" }, 400);
    }

    const cacheKey = `sentiment-daily-data-v1:from${startDate}-to${endDate}`;

    try {
        const cachedData = await kv.get<DailySentimentData[]>(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return jsonResponse({ data: cachedData });
        }
        console.log(`Cache miss for key: ${cacheKey}`);

        const whereClauses = [
            `CAST(created_at AS DATE) >= date('${startDate}')`,
            `CAST(created_at AS DATE) <= date('${endDate}')`
        ];

        const query = `
        SELECT
            keyword,
            CAST(created_at AS DATE) AS date,
            AVG(sentiment_score_positive) AS avg_pos,
            AVG(sentiment_score_negative) AS avg_neg,
            AVG(sentiment_score_mixed) AS avg_mix,
            AVG(sentiment_score_neutral) AS avg_neutral,
            COUNT(1) AS count
        FROM
            "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE
            ${whereClauses.join(' AND \n            ')}
        GROUP BY
            keyword, CAST(created_at AS DATE)
        ORDER BY
            keyword, date;
    `; // Corrected template literal

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
        const maxAttempts = ATHENA_MAX_POLL_ATTEMPTS;
        const pollInterval = ATHENA_POLL_INTERVAL_MS;

        while (attempts < maxAttempts) {
            const getQueryExecutionCmd = new GetQueryExecutionCommand({ QueryExecutionId });
            const { QueryExecution } = await athenaClient.send(getQueryExecutionCmd); // Correct variable name
            status = QueryExecution?.Status?.State;

            if (status === QueryExecutionState.SUCCEEDED) break;
            if (status === QueryExecutionState.FAILED || status === QueryExecutionState.CANCELLED) {
                // Corrected template literal for error message
                throw new Error(`Query ${QueryExecutionId} failed or was cancelled. State: ${status}. Reason: ${QueryExecution?.Status?.StateChangeReason}`);
            }
            attempts++;
            await delay(pollInterval);
        }

        if (status !== QueryExecutionState.SUCCEEDED) {
            // Corrected template literal for error message
            throw new Error(`Query ${QueryExecutionId} did not complete successfully after ${attempts} attempts. Final state: ${status}`);
        }

        const getQueryResultsCmd = new GetQueryResultsCommand({ QueryExecutionId });
        const results = await athenaClient.send(getQueryResultsCmd);
        const parsedData = parseAthenaDailyResults(results);

        if (Array.isArray(parsedData)) {
            const ttl = parsedData.length > 0 ? CACHE_TTL_SECONDS : CACHE_TTL_EMPTY_SECONDS;
            await kv.set(cacheKey, parsedData, { ex: ttl });
            // Corrected template literal for log message
            console.log(`Cached result (TTL: ${ttl}s) for key: ${cacheKey}`);
        }

        return jsonResponse({ data: parsedData });

    } catch (error) {
        console.error("Athena Query Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return jsonResponse({ error: "Failed to query Athena", details: errorMessage }, 500);
    }
} 