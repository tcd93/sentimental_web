import { kv } from "@vercel/kv";
import {
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  QueryExecutionState,
  GetQueryResultsCommandOutput,
} from "@aws-sdk/client-athena";
import {
  ATHENA_DB,
  ATHENA_TABLE,
  ATHENA_OUTPUT_LOCATION,
  CACHE_TTL_SECONDS,
  CACHE_TTL_EMPTY_SECONDS,
  ATHENA_POLL_INTERVAL_MS,
  ATHENA_MAX_POLL_ATTEMPTS,
} from "@/lib/config";
import { athenaClient, delay } from "@/lib/awsClients";
import { jsonResponse } from "../../response";
import { SentimentControversy, SentimentControversySchema } from "@/lib/types/sentiment";

// Helper to parse Athena results for delta leaderboard
const parseAthenaResults = (
  results: GetQueryResultsCommandOutput
): SentimentControversy[] => {
  const rows = results.ResultSet?.Rows ?? [];
  if (rows.length < 2) return [];
  const columns = rows[0].Data?.map((datum) => datum.VarCharValue) ?? [];

  const data = rows.slice(1).map((row) => {
    const parsed_row = row.Data?.reduce((obj, field, i) => {
      const key = columns[i] as keyof SentimentControversy;
      const value = field.VarCharValue;

      switch (key) {
        case "keyword":
          obj[key] = value;
          break;
        case "score":
          obj[key] = value !== undefined ? Number(value) : null;
          break;
        case "type":
          obj[key] = value as "POSITIVE" | "NEGATIVE";
          break;
      }
      return obj;
    }, {} as Partial<SentimentControversy>);

    return SentimentControversySchema.parse(parsed_row);
  });

  return data;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Validate params
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !startDate ||
    !endDate ||
    !dateRegex.test(startDate) ||
    !dateRegex.test(endDate)
  ) {
    return jsonResponse(
      {
        error:
          "Missing or invalid required query parameters: startDate and endDate must be in YYYY-MM-DD format",
      },
      400
    );
  }
  if (new Date(startDate) > new Date(endDate)) {
    return jsonResponse(
      { error: "Invalid date range: startDate cannot be after endDate" },
      400
    );
  }

  const cacheKey = `sentiment-contro-v2:l${limit}-from${startDate}-to${endDate}`;
  const cachedList = await kv.get<SentimentControversy[]>(cacheKey);
  if (cachedList) {
    return jsonResponse({ data: cachedList });
  }

  // Athena SQL for controversy calculation
  const query = `
      WITH daily_avg AS (
        SELECT
            keyword,
            cast(created_at AS date) AS sentiment_date,
            avg(sentiment_score_positive) AS avg_pos,
            avg(sentiment_score_negative) AS avg_neg
        FROM "${ATHENA_DB}"."${ATHENA_TABLE}"
        WHERE cast(created_at AS date) BETWEEN date('${startDate}') AND date('${endDate}')
        GROUP BY keyword, cast(created_at AS date)
        HAVING COUNT(1) > 20
    ), volatility AS (
        SELECT
            keyword,
            stddev_samp(avg_pos) AS pos_volatility,
            stddev_samp(avg_neg) AS neg_volatility
        FROM daily_avg
        GROUP BY keyword
    ), ranked AS (
        SELECT
            keyword,
            CASE
                WHEN pos_volatility >= neg_volatility THEN pos_volatility
                ELSE neg_volatility
            END AS score,
            CASE
                WHEN pos_volatility >= neg_volatility THEN 'POSITIVE'
                ELSE 'NEGATIVE'
            END AS type
        FROM volatility
    )
    SELECT *
    FROM ranked
    ORDER BY score DESC
    LIMIT ${limit};
    `;

  const startQueryCmd = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: { Database: ATHENA_DB },
    ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
  });
  const { QueryExecutionId } = await athenaClient.send(startQueryCmd);
  if (!QueryExecutionId) throw new Error("Failed to start query execution.");
  let status,
    attempts = 0;
  while (attempts < ATHENA_MAX_POLL_ATTEMPTS) {
    const { QueryExecution } = await athenaClient.send(
      new GetQueryExecutionCommand({ QueryExecutionId })
    );
    status = QueryExecution?.Status?.State;
    if (status === QueryExecutionState.SUCCEEDED) break;
    if (
      status === QueryExecutionState.FAILED ||
      status === QueryExecutionState.CANCELLED
    ) {
      throw new Error(
        `Query ${QueryExecutionId} failed or was cancelled. State: ${status}`
      );
    }
    attempts++;
    await delay(ATHENA_POLL_INTERVAL_MS);
  }
  if (status !== QueryExecutionState.SUCCEEDED) {
    throw new Error(
      `Query ${QueryExecutionId} did not complete successfully after ${attempts} attempts. Final state: ${status}`
    );
  }
  const results = await athenaClient.send(
    new GetQueryResultsCommand({ QueryExecutionId })
  );
  // Parse Athena results
  const parsedData = parseAthenaResults(results);
  // Cache result
  const ttl =
    parsedData.length > 0 ? CACHE_TTL_SECONDS : CACHE_TTL_EMPTY_SECONDS;
  await kv.set(cacheKey, parsedData, { ex: ttl });
  return jsonResponse({ data: parsedData });
}
