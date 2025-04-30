import React, { useMemo } from "react";
import { useDailyData } from "@/contexts/DailyDataProvider";

import {
  aggregateControversyDataByKeyword,
  aggregateSentimentDataByKeyword,
} from "@/lib/types/Aggregators";
import {
  ControversyListItem,
  isControversyItem,
} from "@/lib/types/ControversyListItem";
import { DailySentimentData } from "@/lib/types/DailySentimentData";
import { SentimentData } from "@/lib/types/SentimentData";
import { getListTitle } from "@/lib/utils";
import { Info } from "lucide-react";

interface SentimentListProps {
  metric: "avg_pos" | "avg_neg" | "volatility";
  colorClass: string;
  listHeight?: number;
}

const calculatePositiveList = (data: DailySentimentData[]): SentimentData[] => {
  const aggregatedData = aggregateSentimentDataByKeyword(data);
  const sorted = aggregatedData
    .filter((item) => item.total_count > 20)
    .sort((a, b) => (b.avg_pos ?? -1) - (a.avg_pos ?? -1));
  return sorted.slice(0, 20);
};

const calculateNegativeList = (data: DailySentimentData[]): SentimentData[] => {
  const aggregatedData = aggregateSentimentDataByKeyword(data);
  const sorted = aggregatedData
    .filter((item) => item.total_count > 20)
    .sort((a, b) => (b.avg_neg ?? -1) - (a.avg_neg ?? -1));
  return sorted.slice(0, 20);
};

export const calculateControversialList = (
  data: DailySentimentData[]
): ControversyListItem[] => {
  const aggregatedData = aggregateControversyDataByKeyword(data);
  const filtered = aggregatedData.filter((item) => item.count >= 20);
  const sorted = filtered.sort((a, b) => b.score - a.score);
  return sorted.slice(0, 20);
};

const SentimentList: React.FC<SentimentListProps> = ({
  metric,
  colorClass,
  listHeight = 360,
}) => {
  const containerStyle = { height: listHeight };
  const { dailyDataState, startDate, endDate, setSelectedKeyword } =
    useDailyData();
  const { data: dailyData, loading, error } = dailyDataState;

  const baseTitle = useMemo(() => {
    switch (metric) {
      case "avg_pos":
        return "Top 20 Most Positive Games";
      case "avg_neg":
        return "Top 20 Most Negative Games";
      case "volatility":
        return "Top 20 Controversies";
      default:
        return "Sentiment List";
    }
  }, [metric]);

  const dynamicTitle = useMemo(
    () => getListTitle(baseTitle, startDate, endDate),
    [baseTitle, startDate, endDate]
  );

  const calculatedData: Array<SentimentData | ControversyListItem> =
    useMemo(() => {
      if (dailyData.length === 0) return [];
      if (metric === "avg_pos") {
        return calculatePositiveList(dailyData);
      } else if (metric === "avg_neg") {
        return calculateNegativeList(dailyData);
      } else {
        return calculateControversialList(dailyData);
      }
    }, [dailyData, metric]);

  const controversyScoreExplanation =
    "Controversy Score: Measures how evenly split sentiment is (using average mixed score). Higher scores indicate more balanced sentiment. Excludes keywords mentioned < 20 times.";

  if (loading)
    return (
      <div
        style={containerStyle}
        className="bg-gray-800 shadow-lg rounded-2xl pl-6 pr-6 pt-6 w-full flex flex-col"
      >
        <div className="h-8 bg-gray-700 rounded-xl mb-6 animate-pulse w-3/4 self-center"></div>
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
        className="bg-gray-800 shadow-lg rounded-2xl p-6 w-full flex flex-col items-center justify-center text-center"
      >
        <h2 className={`text-xl font-semibold ${colorClass} mb-4`}>
          {dynamicTitle}
        </h2>
        <p className="text-red-500">Error loading list:</p>
        <p className="text-red-400 text-sm mt-1">{error}</p>
      </div>
    );

  if (!calculatedData || calculatedData.length === 0)
    return (
      <div
        style={containerStyle}
        className="bg-gray-800 shadow-lg rounded-2xl p-6 w-full flex flex-col items-center justify-center text-center"
      >
        <h2 className={`text-xl font-semibold ${colorClass} mb-4`}>
          {dynamicTitle}
        </h2>
        <p className="text-gray-500">
          No data available for this list in the selected date range.
        </p>
      </div>
    );

  return (
    <div
      style={containerStyle}
      className="bg-gray-800 shadow-lg rounded-2xl p-6 w-full flex flex-col overflow-y-auto scrollbar scrollbar-track-transparent scrollbar-thumb-gray-600"
    >
      <div className="flex items-center mb-4">
        <h2 className={`text-xl font-semibold ${colorClass}`}>
          {dynamicTitle}
        </h2>
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
        {calculatedData.map((item, index) => {
          let displayValue: number | null = null;
          let displayKey: string = "";
          let displayCount: number | undefined = undefined;
          let icon: React.ReactNode | null = null;

          if (isControversyItem(item) && metric === "volatility") {
            displayValue = item.score;
            displayKey = item.keyword;
            displayCount = item.count;
            if (item.type === "POSITIVE_DOMINANT") {
              icon = <span className="inline-block ml-1 align-middle">🔥</span>;
            } else if (item.type === "NEGATIVE_DOMINANT") {
              icon = <span className="inline-block ml-1 align-middle">💀</span>;
            } else if (item.type === "CHAOTIC") {
              icon = <span className="inline-block ml-1 align-middle">⚡</span>;
            }
          } else if (!isControversyItem(item)) {
            displayKey = item.keyword;
            displayCount = item.total_count;
            if (metric === "avg_pos") {
              displayValue = item.avg_pos;
            } else if (metric === "avg_neg") {
              displayValue = item.avg_neg;
            }
          }

          if (!displayKey) return null;

          return (
            <li
              key={displayKey}
              className="p-4 bg-gray-700 rounded-xl shadow flex justify-between items-center transition-colors duration-150 hover:bg-gray-600/80 cursor-pointer"
              onClick={() => setSelectedKeyword(displayKey)}
            >
              <span className="font-medium text-lg">
                {index + 1}. {displayKey}
              </span>
              <div className="text-right text-sm">
                <div className="flex items-center justify-end">
                  <span className={`${colorClass} block`}>
                    {displayValue !== null && displayValue !== undefined
                      ? displayValue.toFixed(2)
                      : "N/A"}
                  </span>
                  {icon}
                </div>
                {displayCount !== undefined && displayCount !== null ? (
                  <span className="text-gray-400 block">
                    Count: {displayCount}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SentimentList;
