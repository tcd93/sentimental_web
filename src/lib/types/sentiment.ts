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

export const SentimentControversySchema = z.object({
  keyword: z.string(),
  count: z.number(),
  score: z.number().nullable().describe("Controversy score based on stddev_samp"),
  type: z.enum(["POSITIVE", "NEGATIVE"]).nullable().describe("Dominant type of sentiment change"),
});
export type SentimentControversy = z.infer<typeof SentimentControversySchema>;

export const DistributionDataPointSchema = z.object({
  sentiment: z.string(),
  count: z.number(),
});
export type DistributionDataPoint = z.infer<typeof DistributionDataPointSchema>;
