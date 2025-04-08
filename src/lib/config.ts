export const AWS_REGION = process.env.AWS_REGION!;
export const ATHENA_DB = process.env.ATHENA_DB!;
export const ATHENA_TABLE = process.env.ATHENA_TABLE!;
export const ATHENA_OUTPUT_LOCATION = process.env.ATHENA_OUTPUT_LOCATION!;

// Standard Cache TTL (e.g., 12 hours)
export const CACHE_TTL_SECONDS = 12 * 60 * 60; 
// Short Cache TTL for empty results (e.g., 15 minutes)
export const CACHE_TTL_EMPTY_SECONDS = 15 * 60;

// Athena Polling Configuration
export const ATHENA_POLL_INTERVAL_MS = 1000; // Milliseconds between checking query status
export const ATHENA_MAX_POLL_ATTEMPTS = 10;  // Max number of times to check status
