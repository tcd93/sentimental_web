import React from "react";
import { SentimentControversy, SentimentSummary } from "@/lib/types/sentiment";
import { ListState } from "@/lib/reducers/listReducer";
import { Info } from "lucide-react";

// Define the interface for props including the click handler
interface SentimentListProps {
  title: string;
  listState: ListState<SentimentSummary | SentimentControversy>; // Replace separate props with ListState
  metric: "avg_pos" | "avg_neg" | "volatility";
  colorClass: string;
  onKeywordClick: (keyword: string) => void;
  listHeight?: number;
}

const SentimentList: React.FC<SentimentListProps> = ({
  title,
  listState, // Use listState instead of separate props
  metric,
  colorClass,
  onKeywordClick,
  listHeight = 360,
}) => {
  const containerStyle = { height: listHeight };
  const { data, loading, error } = listState; // Destructure from listState

  const controversyScoreExplanation =
    "Controversy Score (0-100): Measures how evenly split sentiment is between positive and negative views. Higher scores indicate more balanced sentiment battles where opinions are closely contested. Excludes keywords mentioned < 20 times.";

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
        {data.map((item, index) => {
          let value: number | null = null;
          let arrow: React.ReactNode = null;
          let arrowColor = "";
          if (
            (metric === "avg_pos" || metric === "avg_neg") &&
            "avg_pos" in item &&
            "avg_neg" in item
          ) {
            value = item[metric as "avg_pos" | "avg_neg"];
          } else if (metric === "volatility" && "score" in item) {
            value = typeof item.score === "number" ? item.score : null;
            if (typeof value === "number") {
              if (item.type === "POSITIVE_DOMINANT") {
                arrow = (
                  <span className="inline-block ml-1 align-middle">🔥</span>
                );
                arrowColor = "text-green-400";
              } else if (item.type === "NEGATIVE_DOMINANT") {
                arrow = (
                  <span className="inline-block ml-1 align-middle">💀</span>
                );
                arrowColor = "text-red-400";
              } else if (item.type === "CHAOTIC") {
                arrow = (
                  <span className="inline-block ml-1 align-middle">⚡</span>
                );
                arrowColor = "text-yellow-400";
              }
            }
          }
          return (
            <li
              key={item.keyword}
              className="p-4 bg-gray-700 rounded-xl shadow flex justify-between items-center transition-colors duration-150 hover:bg-gray-600/80 cursor-pointer"
              onClick={() => onKeywordClick(item.keyword)}
            >
              <span className="font-medium text-lg">
                {index + 1}. {item.keyword}
              </span>
              <div className="text-right text-sm">
                <span className={`${colorClass} block`}>
                  {metric === "volatility" ? (
                    <>
                      {value !== null && value !== undefined
                        ? Math.abs(value).toFixed(2)
                        : "N/A"}
                      {arrow && <span className={arrowColor}>{arrow}</span>}
                    </>
                  ) : value !== null && value !== undefined ? (
                    value.toFixed(2)
                  ) : (
                    "N/A"
                  )}
                </span>
                {"count" in item &&
                item.count !== undefined &&
                item.count !== null ? (
                  <span className="text-gray-400 block">
                    Count: {item.count}
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
