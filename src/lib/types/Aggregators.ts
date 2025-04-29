import { ControversyListItem } from "./ControversyListItem";
import { DailySentimentData } from "./DailySentimentData";
import { SentimentData } from "./SentimentData";

export const aggregateSentimentDataByKeyword = (
  data: DailySentimentData[]
): SentimentData[] => {
  const aggregatedData: {
    [key: string]: Omit<DailySentimentData, "date"> & {
      weighted_pos_sum: number;
      weighted_neg_sum: number;
      weighted_mix_sum: number;
      weighted_neutral_sum: number;
    };
  } = {};

  for (const item of data) {
    const keyword = item.keyword;
    if (!aggregatedData[keyword]) {
      aggregatedData[keyword] = {
        keyword: keyword,
        total_count: 0,
        avg_pos: 0,
        avg_neg: 0,
        avg_mix: 0,
        avg_neutral: 0,
        pos_count: 0,
        neg_count: 0,
        mix_count: 0,
        neutral_count: 0,
        weighted_pos_sum: 0,
        weighted_neg_sum: 0,
        weighted_mix_sum: 0,
        weighted_neutral_sum: 0,
      };
    }

    const existing = aggregatedData[keyword];
    const currentCount = item.total_count ?? 0;
    const newTotalCount = existing.total_count + currentCount;

    // Accumulate weighted sums and total counts
    existing.weighted_pos_sum += item.avg_pos * currentCount;
    existing.weighted_neg_sum += item.avg_neg * currentCount;
    existing.weighted_mix_sum += item.avg_mix * currentCount;
    existing.weighted_neutral_sum += item.avg_neutral * currentCount;
    existing.total_count = newTotalCount;

    // Accumulate counts
    existing.pos_count += item.pos_count ?? 0;
    existing.neg_count += item.neg_count ?? 0;
    existing.mix_count += item.mix_count ?? 0;
    existing.neutral_count += item.neutral_count ?? 0;
  }

  // Calculate final weighted averages
  return Object.values(aggregatedData).map((agg) => {
    const totalCount = agg.total_count;
    return {
      keyword: agg.keyword,
      total_count: totalCount,
      avg_pos: totalCount > 0 ? agg.weighted_pos_sum / totalCount : 0,
      avg_neg: totalCount > 0 ? agg.weighted_neg_sum / totalCount : 0,
      avg_mix: totalCount > 0 ? agg.weighted_mix_sum / totalCount : 0,
      avg_neutral: totalCount > 0 ? agg.weighted_neutral_sum / totalCount : 0,
      pos_count: agg.pos_count,
      neg_count: agg.neg_count,
      mix_count: agg.mix_count,
      neutral_count: agg.neutral_count,
    };
  });
};

export const aggregateControversyDataByKeyword = (
  data: DailySentimentData[]
): ControversyListItem[] => {
  const aggregatedData = {} as {
    [key: string]: {
      pos_dominant_days: number;
      neg_dominant_days: number;
      close_battle_days: number;
      active_days_of_keyword: number;
      total_count: number;
    }
  };

  for (const item of data) {
    const keyword = item.keyword;
    if (!aggregatedData[keyword]) {
      aggregatedData[keyword] = {
        pos_dominant_days: 0,
        neg_dominant_days: 0,
        close_battle_days: 0,
        active_days_of_keyword: 0,
        total_count: 0,
      };
    }

    const existing = aggregatedData[keyword];
    existing.pos_dominant_days += (item.avg_pos > item.avg_neg + 0.1) ? 1 : 0;
    existing.neg_dominant_days += (item.avg_neg > item.avg_pos + 0.1) ? 1 : 0;
    existing.close_battle_days += (Math.abs(item.avg_pos - item.avg_neg) <= 0.1) ? 1 : 0;
    existing.active_days_of_keyword += 1;
    existing.total_count += item.total_count ?? 0;
  }

  const controversyResults: ControversyListItem[] = [];

  // Analyze dominance for each keyword
  for (const keyword in aggregatedData) {
    const item = aggregatedData[keyword];

    // Skip keywords with low counts or no active days
    if (item.total_count <= 20 || item.active_days_of_keyword === 0) {
      continue;
    }

    // console.log(
    //   "keyword: %s, pos_dominant_days: %s, neg_dominant_days: %s, close_battle_days: %s, active_days_of_keyword: %s",
    //   keyword,
    //   item.pos_dominant_days,
    //   item.neg_dominant_days,
    //   item.close_battle_days,
    //   item.active_days_of_keyword
    // );

    // Calculate Ratios
    const pos_dominant_ratio = item.pos_dominant_days / item.active_days_of_keyword;
    const neg_dominant_ratio = item.neg_dominant_days / item.active_days_of_keyword;
    const close_battle_ratio = item.close_battle_days / item.active_days_of_keyword;

    // Calculate Controversy Score
    // Close battle is favored with a higher weight
    const denominator =
      neg_dominant_ratio * 0.275 +
      pos_dominant_ratio * 0.275 +
      close_battle_ratio * 0.45;
    const score =
      denominator > 0 ? (close_battle_ratio * 0.45 * 100) / denominator : 0; // Assign 0 if denominator is 0

    // Determine Controversy Type
    let type: "POSITIVE_DOMINANT" | "NEGATIVE_DOMINANT" | "CHAOTIC";
    if (
      neg_dominant_ratio > pos_dominant_ratio &&
      neg_dominant_ratio > close_battle_ratio
    ) {
      type = "NEGATIVE_DOMINANT";
    } else if (
      pos_dominant_ratio > neg_dominant_ratio &&
      pos_dominant_ratio > close_battle_ratio
    ) {
      type = "POSITIVE_DOMINANT";
    } else {
      type = "CHAOTIC";
    }

    // Add to results
    controversyResults.push({
      keyword: keyword,
      count: item.total_count,
      score: score,
      type: type,
    });
  }

  return controversyResults;
};