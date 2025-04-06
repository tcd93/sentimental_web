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
} from "@aws-sdk/client-athena";

// Constants (reuse or centralize later)
const ATHENA_DB = "sentimental";
const ATHENA_TABLE = "sentiment";
const ATHENA_OUTPUT_LOCATION = "s3://tcd93-sentimental-bucket/athena-results/web";
const AWS_REGION = "ap-southeast-1";

const athenaClient = new AthenaClient({ region: AWS_REGION });
const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Removed the custom Athena interfaces

// Helper function to parse keyword results using SDK types
const parseKeywordsResults = (results: GetQueryResultsCommandOutput): string[] => {
    // Use optional chaining and nullish coalescing with SDK types
    const rows = results.ResultSet?.Rows ?? [];

    // Check if there are enough rows (header + at least one data row)
    if (rows.length < 2) { 
        return [];
    }
    
    // Skip header row (index 0)
    return rows.slice(1)
        // Map over SDK Row type using the correct alias
        .map((row: AthenaSDKRow) => row.Data?.[0]?.VarCharValue) // Use AthenaSDKRow alias here
        // Filter out undefined, null, or empty strings
        .filter((keyword): keyword is string => typeof keyword === 'string' && keyword.length > 0); 
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10); // Allow configurable days

    // Define cache key
    const cacheKey = `keywords:${days}d`;

    try {
        // --- Check Cache First ---
        const cachedKeywords = await kv.get<string[]>(cacheKey);
        if (cachedKeywords) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return NextResponse.json({ keywords: cachedKeywords });
        }
        console.log(`Cache miss for key: ${cacheKey}`);

        // --- If Cache Miss, Query Athena ---
        const query = `
            SELECT DISTINCT keyword 
            FROM "${ATHENA_DB}"."${ATHENA_TABLE}"
            WHERE created_at >= current_timestamp - interval '${days}' day
            ORDER BY keyword ASC;
        `;

        const startQueryCmd = new StartQueryExecutionCommand({
            QueryString: query,
            QueryExecutionContext: { Database: ATHENA_DB },
            ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
        });

        const { QueryExecutionId } = await athenaClient.send(startQueryCmd);

        if (!QueryExecutionId) {
            throw new Error("Failed to start query execution for keywords.");
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
                throw new Error(`Keywords query ${QueryExecutionId} failed/cancelled. State: ${status}. Reason: ${QueryExecution?.Status?.StateChangeReason}`);
            }
            attempts++;
            await delay(pollInterval);
        }

        if (status !== QueryExecutionState.SUCCEEDED) {
             throw new Error(`Keywords query ${QueryExecutionId} did not complete successfully. Final state: ${status}`);
        }

        const getQueryResultsCmd = new GetQueryResultsCommand({ QueryExecutionId });
        // results variable is now correctly typed as GetQueryResultsCommandOutput
        const results = await athenaClient.send(getQueryResultsCmd);
        // parseKeywordsResults now correctly accepts this type
        const keywords = parseKeywordsResults(results);

        // --- Store Result in Cache --- 
        if (Array.isArray(keywords) && keywords.length > 0) { // Only cache if we got results
            await kv.set(cacheKey, keywords, { ex: CACHE_TTL_SECONDS });
            console.log(`Cached result for key: ${cacheKey}`);
        } else {
             console.log(`No keywords found for key: ${cacheKey}. Not caching empty result.`);
        }

        return NextResponse.json({ keywords });

    } catch (error) {
        console.error("Athena Keywords Query Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        // Don't cache errors, just return them
        return NextResponse.json({ error: "Failed to query Athena for keywords", details: errorMessage }, { status: 500 });
    }
} 