import { z } from "zod";

/**
 * Aggregated from {@link DailySentimentDataSchema}
 */
export const SentimentDataSchema = z.object({
  keyword: z.string(),
  avg_pos: z.number(),
  avg_neg: z.number(),
  avg_mix: z.number(),
  avg_neutral: z.number(),
  pos_count: z.number(),
  neg_count: z.number(),
  mix_count: z.number(),
  neutral_count: z.number(),
  /** total count of analyzed posts */
  total_count: z.number(),
});
export type SentimentData = z.infer<typeof SentimentDataSchema>;
