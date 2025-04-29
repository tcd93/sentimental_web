import { z } from "zod";

export const DailySentimentDataSchema = z.object({
  keyword: z.string(),
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "MIXED", "NEUTRAL"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Expecting 'YYYY-MM-DD'
  avg_pos: z.number().nullable(),
  avg_neg: z.number().nullable(),
  avg_mix: z.number().nullable(),
  avg_neutral: z.number().nullable(),
  count: z.number(),
});
export type DailySentimentData = z.infer<typeof DailySentimentDataSchema>;
