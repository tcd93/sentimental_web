import React from "react";

import { Info } from "lucide-react";
import { ListState } from "@/lib/types/ListState";
import { DailySentimentData } from "@/lib/types/DailySentimentData";
import { ControversyListItem } from "@/lib/types/ControversyListItem";
import { AggregatedSentimentItem } from "@/lib/types/AggregatedSentimentItem";
import { aggregateSentimentData } from "./aggregateSentimentData";

interface SentimentListProps {
  title: string;
  dailyDataState: ListState<DailySentimentData>;
  metric: "avg_pos" | "avg_neg" | "volatility";
  colorClass: string;
  onKeywordClick: (keyword: string) => void;
  listHeight?: number;
}

function isControversyItem(
  item: AggregatedSentimentItem | ControversyListItem
): item is ControversyListItem {
  return "score" in item && !("groupKey" in item);
}

const calculatePositiveList = (
  data: DailySentimentData[]
): AggregatedSentimentItem[] => {
  const aggregated = aggregateSentimentData(data, "keyword");

  const sorted = aggregated.sort(
    (a, b) => (b.avg_pos ?? -1) - (a.avg_pos ?? -1)
  );
  return sorted.slice(0, 20);
};

const calculateNegativeList = (
  data: DailySentimentData[]
): AggregatedSentimentItem[] => {
  const aggregated = aggregateSentimentData(data, "keyword");
  const sorted = aggregated.sort(
    (a, b) => (b.avg_neg ?? -1) - (a.avg_neg ?? -1)
  );
  return sorted.slice(0, 20);
};

export const calculateControversialList = (
  data: DailySentimentData[]
): ControversyListItem[] => {
  // Group data by keyword and date
  const group = aggregateSentimentData(data, "keyword_date");

  // Group's group_key is keyword|date, break it into
  // {keyword: keyword, dates: AggregatedSentimentItem[]}
  const groupedByKeyword = group.reduce((acc, item) => {
    const [keyword] = item.group_key.split("|");
    if (!acc[keyword]) {
      acc[keyword] = { keyword, dates: [] };
    }
    acc[keyword].dates.push(item);
    return acc;
  }, {} as { [key: string]: { keyword: string; dates: AggregatedSentimentItem[] } });

  const controversyResults: ControversyListItem[] = [];

  // Analyze dominance for each keyword
  for (const keyword in groupedByKeyword) {
    const items = groupedByKeyword[keyword].dates;
    let pos_dominant_days = 0;
    let neg_dominant_days = 0;
    let close_battle_days = 0;

    const active_days_of_keyword = items.length;
    const total_count = items.reduce((acc, item) => acc + item.count, 0);

    if (total_count <= 20 || active_days_of_keyword === 0) {
      continue;
    }

    for (const item of items) {
      if ((item.avg_pos ?? 0) > (item.avg_neg ?? 0) + 0.1) {
        pos_dominant_days++;
      }
      if ((item.avg_neg ?? 0) > (item.avg_pos ?? 0) + 0.1) {
        neg_dominant_days++;
      }
      if (Math.abs((item.avg_pos ?? 0) - (item.avg_neg ?? 0)) <= 0.1) {
        close_battle_days++;
      }

      if (
        item.count <= 20 ||
        !item.active_days_of_keyword ||
        item.active_days_of_keyword === 0
      ) {
        continue; // Skip keywords with low counts or no active days
      }
    }

    // console.log(
    //   "keyword: %s, pos_dominant_days: %s, neg_dominant_days: %s, close_battle_days: %s, active_days_of_keyword: %s",
    //   keyword,
    //   pos_dominant_days,
    //   neg_dominant_days,
    //   close_battle_days,
    //   active_days_of_keyword
    // );

    // Calculate Ratios
    const pos_dominant_ratio = pos_dominant_days / active_days_of_keyword;
    const neg_dominant_ratio = neg_dominant_days / active_days_of_keyword;
    const close_battle_ratio = close_battle_days / active_days_of_keyword;

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
      count: total_count,
      score: score,
      type: type,
    });
  }

  // Sort by score descending and take top 20
  const sortedResults = controversyResults.sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  return sortedResults.slice(0, 20);
};

const SentimentList: React.FC<SentimentListProps> = ({
  title,
  dailyDataState,
  metric,
  colorClass,
  onKeywordClick,
  listHeight = 360,
}) => {
  const containerStyle = { height: listHeight };
  const { data: dailyData, loading, error } = dailyDataState;

  const controversyScoreExplanation =
    "Controversy Score: Measures how evenly split sentiment is (using average mixed score). Higher scores indicate more balanced sentiment. Excludes keywords mentioned < 20 times.";

  if (loading)
    return (
      <div
        style={containerStyle}
        className="bg-gray-800 shadow-lg rounded-2xl pl-6 pr-6 pt-6 w-full flex flex-col"
      >
        <div className="h-12 bg-gray-700 rounded-xl mb-6 animate-pulse"></div>
        <div className="h-18 bg-gray-700 rounded-xl animate-pulse mb-3"></div>
        <div className="h-18 bg-gray-700 rounded-xl animate-pulse mb-3"></div>
        <div className="h-18 bg-gray-700 rounded-xl animate-pulse mb-3"></div>
        <div className="h-18 bg-gray-700 rounded-xl animate-pulse mb-3"></div>
        <div className="h-18 bg-gray-700 rounded-xl animate-pulse"></div>
      </div>
    );

  if (error)
    return (
      <div
        style={containerStyle}
        className="bg-gray-800 shadow-lg rounded-2xl p-6 w-full flex items-center justify-center text-center text-red-500"
      >
        Error loading {title.toLowerCase()}: {error}
      </div>
    );

  const data =
    metric === "avg_pos"
      ? calculatePositiveList(dailyData)
      : metric === "avg_neg"
      ? calculateNegativeList(dailyData)
      : calculateControversialList(dailyData);

  if (!data || data.length === 0)
    return (
      <div
        style={containerStyle}
        className="bg-gray-800 shadow-lg rounded-2xl p-6 w-full flex items-center justify-center text-center text-gray-500"
      >
        No data available for {title.toLowerCase()}.
      </div>
    );

  return (
    <div
      style={containerStyle}
      className="bg-gray-800 shadow-lg rounded-2xl p-6 w-full flex flex-col overflow-y-auto scrollbar scrollbar-track-transparent scrollbar-thumb-gray-600"
    >
      <div className="flex items-center mb-4">
        <h2 className={`text-xl font-semibold ${colorClass}`}>{title}</h2>
        {metric === "volatility" && (
          <div
            className="ml-2 text-gray-400 cursor-help"
            title={controversyScoreExplanation}
          >
            <Info className="h-4 w-4" />
          </div>
        )}
      </div>
      <ul className="space-y-3 flex-1">
        {(data as Array<AggregatedSentimentItem | ControversyListItem>).map(
          (item, index) => {
            let displayValue: number | null = null;
            let displayKey: string = "";
            let displayCount: number | undefined = undefined;

            if (isControversyItem(item) && metric === "volatility") {
              displayValue = item.score;
              displayKey = item.keyword;
              displayCount = item.count;
            } else if (!isControversyItem(item)) {
              const aggregatedItem = item as AggregatedSentimentItem;
              displayKey = aggregatedItem.group_key;
              displayCount = aggregatedItem.count;
              if (metric === "avg_pos") {
                displayValue = aggregatedItem.avg_pos;
              } else if (metric === "avg_neg") {
                displayValue = aggregatedItem.avg_neg;
              }
            }

            if (!displayKey) return null;

            return (
              <li
                key={displayKey}
                className="p-4 bg-gray-700 rounded-xl shadow flex justify-between items-center transition-colors duration-150 hover:bg-gray-600/80 cursor-pointer"
                onClick={() => onKeywordClick(displayKey)}
              >
                <span className="font-medium text-lg">
                  {index + 1}. {displayKey}
                </span>
                <div className="text-right text-sm">
                  <span className={`${colorClass} block`}>
                    {displayValue !== null && displayValue !== undefined
                      ? displayValue.toFixed(2)
                      : "N/A"}
                  </span>
                  {displayCount !== undefined && displayCount !== null ? (
                    <span className="text-gray-400 block">
                      Count: {displayCount}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          }
        )}
      </ul>
    </div>
  );
};

export default SentimentList;
