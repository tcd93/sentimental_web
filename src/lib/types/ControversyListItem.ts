import { z } from "zod";
import { DailySentimentData } from "./DailySentimentData";
import { SentimentData } from "./SentimentData";

export const ControversyListItemSchema = z.object({
  keyword: z.string(),
  count: z.number(),
  score: z.number(),
  type: z.string(),
});

export type ControversyListItem = z.infer<typeof ControversyListItemSchema>;

export function isControversyItem(
  item: SentimentData | DailySentimentData | ControversyListItem
): item is ControversyListItem {
  return "score" in item && !("groupKey" in item);
}