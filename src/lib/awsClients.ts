import { AthenaClient } from "@aws-sdk/client-athena";
import { AWS_REGION } from './config'; // Import region from config

// Instantiate the client once
const athenaClient = new AthenaClient({ region: AWS_REGION });

// Shared delay function
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Export the shared instance and function
export { athenaClient, delay }; 