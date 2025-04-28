import { z } from "zod";

// New Centralized Data Type
export const DailySentimentDataSchema = z.object({
  keyword: z.string(),
  date: z.string(), // Expecting 'YYYY-MM-DD'
  avg_pos: z.number().nullable(),
  avg_neg: z.number().nullable(),
  avg_mix: z.number().nullable(),
  avg_neutral: z.number().nullable(),
  count: z.number(),
});
export type DailySentimentData = z.infer<typeof DailySentimentDataSchema>;

// Removed old/redundant types
