import React from "react";
import { SentimentSummary } from "@/lib/types/sentiment"; // Adjust the import path as necessary

// Define the interface for props including the click handler
interface SentimentListProps {
  title: string;
  data: SentimentSummary[];
  loading: boolean;
  error: string | null;
  metric: "avg_pos" | "avg_neg";
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
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-96 w-full">
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
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-96 w-full flex items-center justify-center text-center text-red-500">
        Error loading {title.toLowerCase()}: {error}
      </div>
    );
  if (!data || data.length === 0)
    return (
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-96 w-full flex items-center justify-center text-center text-gray-500">
        No data available for {title.toLowerCase()}.
      </div>
    );

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-6">
      <h2 className={`text-2xl font-semibold mb-4 ${colorClass}`}>{title}</h2>
      <ul className="space-y-3">
        {data.map((item, index) => (
          <li
            key={item.keyword}
            className="p-4 bg-gray-700 rounded shadow flex justify-between items-center transition-colors duration-150 hover:bg-gray-600/80 cursor-pointer"
            onClick={() => onKeywordClick(item.keyword)}
          >
            <span className="font-medium text-lg">
              {index + 1}. {item.keyword}
            </span>
            <div className="text-right text-sm">
              <span className={`${colorClass} block`}>
                {metric === "avg_neg" ? "Avg Negative" : "Avg Positive"}:{" "}
                {item[metric]?.toFixed(4)}
              </span>
              <span className="text-gray-400 block">Count: {item.count}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SentimentList;
