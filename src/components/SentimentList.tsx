import React, { useMemo } from "react";

import {
  aggregateControversyDataByKeyword,
  aggregateSentimentDataByKeyword,
} from "@/lib/types/Aggregators";
import { ControversyListItem, isControversyItem } from "@/lib/types/ControversyListItem";
import {
  DailySentimentData,
} from "@/lib/types/DailySentimentData";
import { ListState } from "@/lib/types/ListState";
import { SentimentData } from "@/lib/types/SentimentData";
import { Info } from "lucide-react";

interface SentimentListProps {
  title: string;
  dailyDataState: ListState<DailySentimentData>;
  metric: "avg_pos" | "avg_neg" | "volatility";
  colorClass: string;
  onKeywordClick: (keyword: string) => void;
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
  const sorted = aggregatedData.sort((a, b) => b.score - a.score);
  return sorted.slice(0, 20);
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

  const data = useMemo(() => {
    if (dailyData.length === 0) return [];
    console.log("aggregating data for %s, data length: %d", metric, dailyData.length)
    return metric === "avg_pos"
      ? calculatePositiveList(dailyData)
      : metric === "avg_neg"
      ? calculateNegativeList(dailyData)
      : calculateControversialList(dailyData);
  }, [dailyData, metric]);

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
        {(data as Array<DailySentimentData | ControversyListItem>).map(
          (item, index) => {
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
                onClick={() => onKeywordClick(displayKey)}
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
          }
        )}
      </ul>
    </div>
  );
};

export default SentimentList;
