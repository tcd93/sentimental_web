import React from "react";
// Import new types from dataProcessing
// import { ListState } from "@/lib/reducers/listReducer"; // Removed unused import
import {
    SentimentListDataState,
    ControversyListDataState,
    SentimentListItem,
    ControversyListItem
} from "../lib/dataProcessing";
import { Info } from "lucide-react";

// Define the interface for props including the click handler
interface SentimentListProps {
  title: string;
  // Use a union type for listState as it can be either kind of list
  listState: SentimentListDataState | ControversyListDataState;
  metric: "avg_pos" | "avg_neg" | "volatility";
  colorClass: string;
  onKeywordClick: (keyword: string) => void;
  listHeight?: number;
}

// Helper type guard to check if an item is a ControversyListItem
function isControversyItem(item: SentimentListItem | ControversyListItem): item is ControversyListItem {
    return 'score' in item;
}

const SentimentList: React.FC<SentimentListProps> = ({
  title,
  listState,
  metric,
  colorClass,
  onKeywordClick,
  listHeight = 360,
}) => {
  const containerStyle = { height: listHeight };
  const { data, loading, error } = listState;

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
        {(data as Array<SentimentListItem | ControversyListItem>).map((item, index) => {
          let displayValue: number | null = null;
          let displayKeyword: string = "";
          let displayCount: number | undefined = undefined;

          if (isControversyItem(item) && metric === "volatility") {
            displayValue = item.score;
            displayKeyword = item.keyword;
            displayCount = item.count;
          } else if (!isControversyItem(item)) {
             displayKeyword = item.keyword;
             displayCount = item.count;
             if (metric === "avg_pos") {
                displayValue = item.avg_pos;
             } else if (metric === "avg_neg") {
                displayValue = item.avg_neg;
             }
          }

          if (!displayKeyword) return null;

          return (
            <li
              key={displayKeyword}
              className="p-4 bg-gray-700 rounded-xl shadow flex justify-between items-center transition-colors duration-150 hover:bg-gray-600/80 cursor-pointer"
              onClick={() => onKeywordClick(displayKeyword)}
            >
              <span className="font-medium text-lg">
                {index + 1}. {displayKeyword}
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
        })}
      </ul>
    </div>
  );
};

export default SentimentList;
