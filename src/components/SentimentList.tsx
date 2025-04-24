import React from "react";
import { SentimentControversy, SentimentSummary } from "@/lib/types/sentiment"; // Adjust the import path as necessary

// Define the interface for props including the click handler
interface SentimentListProps {
  title: string;
  data: SentimentSummary[] | SentimentControversy[];
  loading: boolean;
  error: string | null;
  metric: "avg_pos" | "avg_neg" | "volatility";
  colorClass: string;
  onKeywordClick: (keyword: string) => void;
}

const SentimentList: React.FC<SentimentListProps> = ({
  title,
  data,
  loading,
  error,
  metric,
  colorClass,
  onKeywordClick,
}) => {
  if (loading)
    return (
      <div className="bg-gray-800 shadow-lg rounded-2xl p-6 h-96 w-full">
        <div className="h-6 bg-gray-700 rounded w-1/2 mb-6 animate-pulse"></div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="bg-gray-800 shadow-lg rounded-2xl p-6 h-96 w-full flex items-center justify-center text-center text-red-500">
        Error loading {title.toLowerCase()}: {error}
      </div>
    );
  if (!data || data.length === 0)
    return (
      <div className="bg-gray-800 shadow-lg rounded-2xl p-6 h-96 w-full flex items-center justify-center text-center text-gray-500">
        No data available for {title.toLowerCase()}.
      </div>
    );

  return (
    <div className="bg-gray-800 shadow-lg rounded-2xl p-6 h-full flex flex-col overflow-y-auto scrollbar scrollbar-track-transparent scrollbar-thumb-gray-600">
      <h2 className={`text-xl font-semibold mb-4 ${colorClass}`}>{title}</h2>
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
              if (item.type === "POSITIVE") {
                arrow = (
                  <span className="inline-block ml-1 align-middle">▲</span>
                );
                arrowColor = "text-green-400";
              } else if (item.type === "NEGATIVE") {
                arrow = (
                  <span className="inline-block ml-1 align-middle">▼</span>
                );
                arrowColor = "text-red-400";
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
