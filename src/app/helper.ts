import { kv } from "@vercel/kv";
import {
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  QueryExecutionState,
  GetQueryResultsCommandOutput,
  Row,
} from "@aws-sdk/client-athena";
import {
  ATHENA_OUTPUT_LOCATION,
  CACHE_TTL_SECONDS,
  ATHENA_POLL_INTERVAL_MS,
  ATHENA_MAX_POLL_ATTEMPTS,
  ATHENA_DB,
} from "@/lib/config";
import { athenaClient, delay } from "@/lib/awsClients";
import { z } from "zod";

export const getCachedData = async <T>(cacheKey: string) => {
  const cachedData = await kv.get<T>(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for key: ${cacheKey}`);
    return cachedData;
  }
  console.log(`Cache miss for key: ${cacheKey}`);
  return null;
};

export const setCachedData = async <T>(
  cacheKey: string,
  data: T[],
  ttl: number = CACHE_TTL_SECONDS
) => {
  await kv.set(cacheKey, data, { ex: ttl });
  console.log(`Cached result (TTL: ${ttl}s) for key: ${cacheKey}`);
};

/**
 * Queries Athena and returns the results parsed using the provided Zod schema.
 * @param query - The SQL query to execute.
 * @param schema - The Zod schema to parse the results against.
 * @param database - The database to query.
 * @param outputLocation - The location to store the query results.
 */
export const queryAthena = async <T>(
  query: string,
  schema: z.Schema<T>,
  database: string = ATHENA_DB,
  outputLocation: string = ATHENA_OUTPUT_LOCATION
) => {
  const startQueryCmd = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: { Database: database },
    ResultConfiguration: { OutputLocation: outputLocation },
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
    const getQueryExecutionCmd = new GetQueryExecutionCommand({
      QueryExecutionId,
    });
    const { QueryExecution } = await athenaClient.send(getQueryExecutionCmd);
    status = QueryExecution?.Status?.State;

    if (status === QueryExecutionState.SUCCEEDED) break;
    if (
      status === QueryExecutionState.FAILED ||
      status === QueryExecutionState.CANCELLED
    ) {
      throw new Error(
        `Query ${QueryExecutionId} failed or was cancelled. State: ${status}. Reason: ${QueryExecution?.Status?.StateChangeReason}`
      );
    }
    attempts++;
    await delay(pollInterval);
  }

  if (status !== QueryExecutionState.SUCCEEDED) {
    throw new Error(
      `Query ${QueryExecutionId} did not complete successfully after ${attempts} attempts. Final state: ${status}`
    );
  }

  // --- Fetch all results with pagination ---
  const allRows: Row[] = [];
  let nextToken: string | undefined = undefined;

  do {
    const getQueryResultsCmd = new GetQueryResultsCommand({
      QueryExecutionId,
      NextToken: nextToken,
    });
    const pageResults: GetQueryResultsCommandOutput = await athenaClient.send(
      getQueryResultsCmd
    );

    if (pageResults.ResultSet?.Rows) {
      const rowsToAdd =
        nextToken === undefined
          ? pageResults.ResultSet.Rows
          : pageResults.ResultSet.Rows.slice(1);
      allRows.push(...rowsToAdd);
    }

    nextToken = pageResults.NextToken;
  } while (nextToken);
  // --- End Fetch all results ---

  return parseAthenaResults(allRows, schema);
};

const parseAthenaResults = <T>(rows: Row[], schema: z.Schema<T>): T[] => {
  if (rows.length < 2) {
    return [];
  }
  if (!rows[0].Data) {
    console.error("No data found in the header row");
    return [];
  }
  if (rows[0].Data.length === 0) {
    return [];
  }

  const columns = rows[0].Data.map((datum) => datum.VarCharValue);

  return rows.slice(1).map((row) => {
    const raw_row_obj = row.Data?.reduce((obj, field, i) => {
      const key = columns[i];
      const value = field.VarCharValue;

      if (key) {
        if (value === undefined || value === null) {
          obj[key] = null;
        } else {
          const n = Number(value);
          obj[key] = !isNaN(n) ? n : value;
        }
      }
      return obj;
    }, {} as Record<string, string | number | null>);

    try {
      return schema.parse(raw_row_obj);
    } catch (error) {
      console.error("Error parsing Athena row:", error);
      console.error("Raw row object:", raw_row_obj);
      throw new Error(`Failed to parse row: ${JSON.stringify(raw_row_obj)}`);
    }
  });
};
