import { DailySentimentData } from "./types/sentiment";
// Use ListState from listReducer instead of the hook's definition
import { ListState } from "./reducers/listReducer";

// Specific type for Time Series Chart data points
export interface TimeSeriesPoint {
  day: string;
  avg_pos: number | null;
  avg_neg: number | null;
  avg_mix: number | null;
  avg_neutral: number | null;
  count: number;
}

// Specific type for Distribution Chart data points
export interface DistributionPoint {
  sentiment: string;
  count: number;
}

// Specific type for Period Averages (likely one item in the array)
export interface PeriodAverage {
  keyword: string | null; // Can be null if no keyword is selected
  avg_pos: number | null;
  avg_neg: number | null;
  avg_mix: number | null;
  avg_neutral: number | null;
  count: number;
}

// Specific type for items in the Positive/Negative sentiment lists
export interface SentimentListItem {
  keyword: string;
  avg_pos: number | null;
  avg_neg: number | null;
  avg_mix: number | null;
  avg_neutral: number | null;
  count: number;
}

// Specific type for items in the Controversy list
export interface ControversyListItem {
  keyword: string;
  count: number;
  score: number | null; // Representing the controversy metric (e.g., avg_mix)
  type: string | null; // Simplified or removed type
}

// Represents the state structure returned by the calculation functions
// Using ListState now, ensure data type matches (e.g., string[] for keywords)
export type KeywordDataState = ListState<string>; // Note: ListState<string> implies data: string[]
export type ChartDataState = ListState<TimeSeriesPoint>;
export type DistributionDataState = ListState<DistributionPoint>;
export type PeriodAveragesState = ListState<PeriodAverage>;
export type SentimentListDataState = ListState<SentimentListItem>;
export type ControversyListDataState = ListState<ControversyListItem>;

// Calculation Functions (Input type is ListState<DailySentimentData>)

export const calculateKeywordsList = (
  dailyDataState: ListState<DailySentimentData>
): KeywordDataState => {
  const keywords = dailyDataState.data
    ? [...new Set(dailyDataState.data.map((item) => item.keyword))].sort()
    : [];
  return {
    data: keywords,
    loading: dailyDataState.loading,
    error: dailyDataState.error,
  };
};

export const calculateTimeSeriesData = (
  dailyDataState: ListState<DailySentimentData>,
  selectedKeyword: string | null
): ChartDataState => {
  const filteredData = dailyDataState.data
    ? dailyDataState.data.filter((item) =>
        selectedKeyword ? item.keyword === selectedKeyword : true
      )
    : [];

  let chartData: TimeSeriesPoint[];
  if (!selectedKeyword) {
    const dailyAggregation = new Map<
      string,
      {
        sum_pos: number;
        sum_neg: number;
        sum_mix: number;
        sum_neutral: number;
        total_count: number;
      }
    >();
    filteredData.forEach((item) => {
      const day = item.date;
      const current = dailyAggregation.get(day) || {
        sum_pos: 0,
        sum_neg: 0,
        sum_mix: 0,
        sum_neutral: 0,
        total_count: 0,
      };
      current.sum_pos += (item.avg_pos ?? 0) * item.count;
      current.sum_neg += (item.avg_neg ?? 0) * item.count;
      current.sum_mix += (item.avg_mix ?? 0) * item.count;
      current.sum_neutral += (item.avg_neutral ?? 0) * item.count;
      current.total_count += item.count;
      dailyAggregation.set(day, current);
    });
    chartData = Array.from(dailyAggregation.entries())
      .map(([day, totals]) => ({
        day,
        avg_pos:
          totals.total_count > 0 ? totals.sum_pos / totals.total_count : null,
        avg_neg:
          totals.total_count > 0 ? totals.sum_neg / totals.total_count : null,
        avg_mix:
          totals.total_count > 0 ? totals.sum_mix / totals.total_count : null,
        avg_neutral:
          totals.total_count > 0
            ? totals.sum_neutral / totals.total_count
            : null,
        count: totals.total_count,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  } else {
    chartData = filteredData
      .map((d) => ({
        day: d.date,
        avg_pos: d.avg_pos,
        avg_neg: d.avg_neg,
        avg_mix: d.avg_mix,
        avg_neutral: d.avg_neutral,
        count: d.count,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  return {
    data: chartData,
    loading: dailyDataState.loading,
    error: dailyDataState.error,
  };
};

export const calculateDistributionData = (
  dailyDataState: ListState<DailySentimentData>,
  selectedKeyword: string | null
): DistributionDataState => {
  const filteredData = dailyDataState.data
    ? dailyDataState.data.filter((item) =>
        selectedKeyword ? item.keyword === selectedKeyword : true
      )
    : [];

  const totalCount = filteredData.reduce((sum, d) => sum + d.count, 0);
  if (totalCount === 0) {
    return {
      data: [],
      loading: dailyDataState.loading,
      error: dailyDataState.error,
    };
  }

  const weightedSumPos = filteredData.reduce(
    (sum, d) => sum + (d.avg_pos || 0) * d.count,
    0
  );
  const weightedSumNeg = filteredData.reduce(
    (sum, d) => sum + (d.avg_neg || 0) * d.count,
    0
  );
  const weightedSumMix = filteredData.reduce(
    (sum, d) => sum + (d.avg_mix || 0) * d.count,
    0
  );
  const weightedSumNeu = filteredData.reduce(
    (sum, d) => sum + (d.avg_neutral || 0) * d.count,
    0
  );

  const overallAvgPos = weightedSumPos / totalCount;
  const overallAvgNeg = weightedSumNeg / totalCount;
  const overallAvgMix = weightedSumMix / totalCount;
  const overallAvgNeu = weightedSumNeu / totalCount;

  const totalAvgSum =
    overallAvgPos + overallAvgNeg + overallAvgMix + overallAvgNeu;

  let distribution: DistributionPoint[];
  if (totalAvgSum > 0) {
    distribution = [
      {
        sentiment: "Positive",
        count: Math.round((overallAvgPos / totalAvgSum) * totalCount),
      },
      {
        sentiment: "Negative",
        count: Math.round((overallAvgNeg / totalAvgSum) * totalCount),
      },
      {
        sentiment: "Mixed",
        count: Math.round((overallAvgMix / totalAvgSum) * totalCount),
      },
      {
        sentiment: "Neutral",
        count: Math.round((overallAvgNeu / totalAvgSum) * totalCount),
      },
    ];
    const currentSum = distribution.reduce((sum, d) => sum + d.count, 0);
    if (currentSum !== totalCount && distribution.length > 0) {
      distribution[0].count += totalCount - currentSum;
    }
  } else {
    distribution = [
      { sentiment: "Positive", count: 0 },
      { sentiment: "Negative", count: 0 },
      { sentiment: "Mixed", count: 0 },
      { sentiment: "Neutral", count: totalCount },
    ];
  }

  return {
    data: distribution,
    loading: dailyDataState.loading,
    error: dailyDataState.error,
  };
};

export const calculatePeriodAverages = (
  dailyDataState: ListState<DailySentimentData>,
  selectedKeyword: string | null
): PeriodAveragesState => {
  const filteredData = dailyDataState.data
    ? dailyDataState.data.filter((item) =>
        selectedKeyword ? item.keyword === selectedKeyword : true
      )
    : [];

  if (!filteredData || filteredData.length === 0) {
    return {
      data: [],
      loading: dailyDataState.loading,
      error: dailyDataState.error,
    };
  }

  const totalCount = filteredData.reduce((sum, d) => sum + d.count, 0);
  if (totalCount === 0) {
    return {
      data: [],
      loading: dailyDataState.loading,
      error: dailyDataState.error,
    };
  }

  const avg_pos =
    filteredData.reduce((sum, d) => sum + (d.avg_pos || 0) * d.count, 0) /
    totalCount;
  const avg_neg =
    filteredData.reduce((sum, d) => sum + (d.avg_neg || 0) * d.count, 0) /
    totalCount;
  const avg_mix =
    filteredData.reduce((sum, d) => sum + (d.avg_mix || 0) * d.count, 0) /
    totalCount;
  const avg_neutral =
    filteredData.reduce((sum, d) => sum + (d.avg_neutral || 0) * d.count, 0) /
    totalCount;

  const averages: PeriodAverage[] = [
    {
      keyword: selectedKeyword,
      avg_pos: avg_pos || null,
      avg_neg: avg_neg || null,
      avg_mix: avg_mix || null,
      avg_neutral: avg_neutral || null,
      count: totalCount,
    },
  ];

  return {
    data: averages,
    loading: dailyDataState.loading,
    error: dailyDataState.error,
  };
};

const aggregateSentimentByKeyword = (
  data: DailySentimentData[]
): SentimentListItem[] => {
  const aggregation = new Map<
    string,
    {
      sum_pos: number;
      sum_neg: number;
      sum_mix: number;
      sum_neutral: number;
      total_count: number;
    }
  >();

  data.forEach((item) => {
    const current = aggregation.get(item.keyword) || {
      sum_pos: 0,
      sum_neg: 0,
      sum_mix: 0,
      sum_neutral: 0,
      total_count: 0,
    };
    current.sum_pos += (item.avg_pos || 0) * item.count;
    current.sum_neg += (item.avg_neg || 0) * item.count;
    current.sum_mix += (item.avg_mix || 0) * item.count;
    current.sum_neutral += (item.avg_neutral || 0) * item.count;
    current.total_count += item.count;
    aggregation.set(item.keyword, current);
  });

  const result: SentimentListItem[] = Array.from(aggregation.entries()).map(
    ([keyword, totals]) => ({
      keyword,
      avg_pos:
        totals.total_count > 0 ? totals.sum_pos / totals.total_count : null,
      avg_neg:
        totals.total_count > 0 ? totals.sum_neg / totals.total_count : null,
      avg_mix:
        totals.total_count > 0 ? totals.sum_mix / totals.total_count : null,
      avg_neutral:
        totals.total_count > 0 ? totals.sum_neutral / totals.total_count : null,
      count: totals.total_count,
    })
  );

  return result.filter((item) => item.count > 20);
};

export const calculatePositiveList = (
  dailyDataState: ListState<DailySentimentData>
): SentimentListDataState => {
  const aggregated = dailyDataState.data
    ? aggregateSentimentByKeyword(dailyDataState.data)
    : [];
  const sorted = aggregated.sort(
    (a, b) => (b.avg_pos ?? -1) - (a.avg_pos ?? -1)
  );
  return {
    data: sorted.slice(0, 20),
    loading: dailyDataState.loading,
    error: dailyDataState.error,
  };
};

export const calculateNegativeList = (
  dailyDataState: ListState<DailySentimentData>
): SentimentListDataState => {
  const aggregated = dailyDataState.data
    ? aggregateSentimentByKeyword(dailyDataState.data)
    : [];
  const sorted = aggregated.sort(
    (a, b) => (b.avg_neg ?? -1) - (a.avg_neg ?? -1)
  );
  return {
    data: sorted.slice(0, 20),
    loading: dailyDataState.loading,
    error: dailyDataState.error,
  };
};

export const calculateControversialList = (
  dailyDataState: ListState<DailySentimentData>
): ControversyListDataState => {
  if (!dailyDataState.data) {
    return {
      data: [],
      loading: dailyDataState.loading,
      error: dailyDataState.error,
    };
  }

  // 1. Group data by keyword
  const groupedByKeyword = dailyDataState.data.reduce((acc, item) => {
    const keyword = item.keyword;
    if (!acc[keyword]) {
      acc[keyword] = [];
    }
    acc[keyword].push(item);
    return acc;
  }, {} as Record<string, DailySentimentData[]>);

  const controversyResults: ControversyListItem[] = [];

  // 2. Analyze dominance for each keyword
  for (const keyword in groupedByKeyword) {
    const dailyData = groupedByKeyword[keyword];
    let pos_dominant_days = 0;
    let neg_dominant_days = 0;
    let close_battle_days = 0;
    let total_count = 0;
    const active_days = dailyData.length;

    dailyData.forEach((item) => {
      const avg_pos = item.avg_pos ?? 0;
      const avg_neg = item.avg_neg ?? 0;
      total_count += item.count;

      // Determine day type based on defined criteria
      if (avg_pos > avg_neg + 0.1) {
        pos_dominant_days++;
      } else if (avg_neg > avg_pos + 0.1) {
        neg_dominant_days++;
      } else {
        // Includes abs(avg_pos - avg_neg) <= 0.1
        close_battle_days++;
      }
    });

    // 4. Filter by total_count > 20
    if (total_count <= 20 || active_days === 0) {
      continue; // Skip keywords with low counts or no active days
    }

    // 5. Calculate Ratios
    const pos_dominant_ratio = pos_dominant_days / active_days;
    const neg_dominant_ratio = neg_dominant_days / active_days;
    const close_battle_ratio = close_battle_days / active_days;

    // 6. Calculate Controversy Score
    const denominator =
      neg_dominant_ratio * 0.275 +
      pos_dominant_ratio * 0.275 +
      close_battle_ratio * 0.45;
    const score =
      denominator > 0 ? (close_battle_ratio * 0.45 * 100) / denominator : 0; // Assign 0 if denominator is 0

    // 7. Determine Controversy Type
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
      keyword,
      count: total_count,
      score: score, // Use calculated score
      type: type, // Use determined type
    });
  }

  // 8. Sort by score descending and take top 20
  const sortedResults = controversyResults.sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  return {
    data: sortedResults.slice(0, 20),
    loading: dailyDataState.loading,
    error: dailyDataState.error,
  };
};
