import { z } from "zod";

// Timeseries Data Point
export const TimeseriesDataPointSchema = z.object({
  day: z.string(),
  avg_pos: z.number().nullable(),
  avg_neg: z.number().nullable(),
  avg_mix: z.number().nullable(),
  avg_neutral: z.number().nullable(),
  count: z.number(),
});
export type TimeseriesDataPoint = z.infer<typeof TimeseriesDataPointSchema>;

// Sentiment Summary (used for SentimentData and PeriodAverages)
export const SentimentSummarySchema = z.object({
  keyword: z.string(),
  avg_pos: z.number().nullable(),
  avg_neg: z.number().nullable(),
  avg_mix: z.number().nullable(),
  avg_neutral: z.number().nullable(),
  count: z.number(),
});
export type SentimentSummary = z.infer<typeof SentimentSummarySchema>;

// Sentiment Delta (used for Gainers and Losers)
export const SentimentDeltaSchema = z.object({
  keyword: z.string(),
  delta: z.number().nullable(),
  delta_type: z.enum(["POSITIVE", "NEGATIVE"]).nullable(),
});
export type SentimentDelta = z.infer<typeof SentimentDeltaSchema>;

// Distribution Data Point
export const DistributionDataPointSchema = z.object({
  sentiment: z.string(),
  count: z.number(),
});
export type DistributionDataPoint = z.infer<typeof DistributionDataPointSchema>;
