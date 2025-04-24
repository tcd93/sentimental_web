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
import { SentimentDelta, SentimentDeltaSchema } from "@/lib/types/sentiment";

// Helper to parse Athena results for delta leaderboard
const parseAthenaResults = (
  results: GetQueryResultsCommandOutput
): SentimentDelta[] => {
  const rows = results.ResultSet?.Rows ?? [];
  if (rows.length < 2) return [];
  const columns = rows[0].Data?.map((datum) => datum.VarCharValue) ?? [];

  const data = rows.slice(1).map((row) => {
    const parsed_row = row.Data?.reduce((obj, field, i) => {
      const key = columns[i] as keyof SentimentDelta;
      const value = field.VarCharValue;

      switch (key) {
        case "keyword":
          obj[key] = value;
          break;
        case "delta":
          obj[key] = value !== undefined ? Number(value) : null;
          break;
        case "delta_type":
          obj[key] = value as "POSITIVE" | "NEGATIVE";
          break;
      }
      return obj;
    }, {} as Partial<SentimentDelta>);

    return SentimentDeltaSchema.parse(parsed_row);
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

  const deltaCacheKey = `sentiment-delta-v2:l${limit}-from${startDate}-to${endDate}`;
  const cachedDelta = await kv.get<SentimentDelta[]>(deltaCacheKey);
  if (cachedDelta) {
    return jsonResponse({ data: cachedDelta });
  }

  // Athena SQL for delta calculation
  const deltaQuery = `
      WITH min_max AS (
          SELECT
              keyword,
              min(cast(created_at AS date)) AS min_date,
              max(cast(created_at AS date)) AS max_date
          FROM "${ATHENA_DB}"."${ATHENA_TABLE}"
          WHERE cast(created_at as date) between date '${startDate}' and date '${endDate}'
          GROUP BY keyword
          HAVING count(1) > 20
      ), first_last AS (
          SELECT
              s.keyword,
              avg(CASE WHEN cast(s.created_at as date) = m.min_date THEN sentiment_score_positive END) AS start_avg_pos,
              avg(CASE WHEN cast(s.created_at as date) = m.max_date THEN sentiment_score_positive END) AS end_avg_pos,
              avg(CASE WHEN cast(s.created_at as date) = m.min_date THEN sentiment_score_negative END) AS start_avg_neg,
              avg(CASE WHEN cast(s.created_at as date) = m.max_date THEN sentiment_score_negative END) AS end_avg_neg
          FROM "${ATHENA_DB}"."${ATHENA_TABLE}" s
          INNER JOIN min_max m 
          ON s.keyword = m.keyword 
              AND (cast(s.created_at as date) = m.min_date OR cast(s.created_at as date) = m.max_date)
          GROUP BY s.keyword
      )
      SELECT  
          keyword,
          CASE
            WHEN abs(end_avg_pos - start_avg_pos) >= abs(end_avg_neg - start_avg_neg) THEN (end_avg_pos - start_avg_pos)
            ELSE (end_avg_neg - start_avg_neg)
          END AS delta,
          CASE
            WHEN abs(end_avg_pos - start_avg_pos) >= abs(end_avg_neg - start_avg_neg) THEN 'POSITIVE'
            ELSE 'NEGATIVE'
          END AS delta_type
      FROM first_last
      ORDER BY abs(delta) DESC
      LIMIT ${limit}
    `;

  const startQueryCmd = new StartQueryExecutionCommand({
    QueryString: deltaQuery,
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
  // Parse Athena results for delta
  const parsedData = parseAthenaResults(results);
  // Cache result
  const ttl =
    parsedData.length > 0 ? CACHE_TTL_SECONDS : CACHE_TTL_EMPTY_SECONDS;
  await kv.set(deltaCacheKey, parsedData, { ex: ttl });
  return jsonResponse({ data: parsedData });
}
