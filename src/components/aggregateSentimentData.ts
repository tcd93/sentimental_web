import { DailySentimentData } from "@/lib/types/DailySentimentData";
import { AggregatedSentimentItem } from "@/lib/types/AggregatedSentimentItem";

// Type for the groupBy parameter
export type GroupByOption = "keyword" | "date" | "sentiment" | "keyword_date";

/**
 * Aggregates daily sentiment data based on a specified grouping dimension.
 * @param data - The daily sentiment data to aggregate.
 * @param groupBy - The dimension to group by ('keyword', 'date', 'sentiment', or 'keyword_date').
 * @returns An array of aggregated sentiment items.
 */
export const aggregateSentimentData = (
  data: DailySentimentData[],
  groupBy: GroupByOption
): AggregatedSentimentItem[] => {
  const aggregation = new Map<
    string,
    {
      sum_pos: number;
      sum_neg: number;
      sum_mix: number;
      sum_neutral: number;
      pos_count: number;
      neg_count: number;
      mix_count: number;
      neutral_count: number;
      total_count: number;
      date_set: Set<string>;
    }
  >();

  data.forEach((item) => {
    let groupKey: string;
    switch (groupBy) {
      case "date":
        groupKey = item.date;
        break;
      case "sentiment":
        groupKey = item.sentiment;
        break;
      case "keyword_date":
        groupKey = `${item.keyword}|${item.date}`;
        break;
      case "keyword":
      default:
        groupKey = item.keyword;
        break;
    }

    const current = aggregation.get(groupKey) || {
      sum_pos: 0,
      sum_neg: 0,
      sum_mix: 0,
      sum_neutral: 0,
      pos_count: 0,
      neg_count: 0,
      mix_count: 0,
      neutral_count: 0,
      total_count: 0,
      date_set: new Set<string>(),
    };
    current.sum_pos += (item.avg_pos || 0) * item.count;
    current.sum_neg += (item.avg_neg || 0) * item.count;
    current.sum_mix += (item.avg_mix || 0) * item.count;
    current.sum_neutral += (item.avg_neutral || 0) * item.count;
    current.pos_count += item.sentiment === "POSITIVE" ? item.count : 0;
    current.neg_count += item.sentiment === "NEGATIVE" ? item.count : 0;
    current.mix_count += item.sentiment === "MIXED" ? item.count : 0;
    current.neutral_count += item.sentiment === "NEUTRAL" ? item.count : 0;
    current.total_count += item.count;
    
    current.date_set.add(item.date);

    aggregation.set(groupKey, current);
  });

  const result: AggregatedSentimentItem[] = Array.from(aggregation.entries()).map(
    ([group_key, totals]) => ({
      group_key,
      avg_pos: totals.sum_pos / totals.total_count,
      avg_neg: totals.sum_neg / totals.total_count,
      avg_mix: totals.sum_mix / totals.total_count,
      avg_neutral: totals.sum_neutral / totals.total_count,
      count: totals.total_count,
      pos_count: totals.pos_count,
      neg_count: totals.neg_count,
      mix_count: totals.mix_count,
      neutral_count: totals.neutral_count,
      active_days_of_keyword: totals.date_set.size,
    })
  );

  return result;
};
