import { DailySentimentData } from "@/lib/types/DailySentimentData";
import { ListState } from "@/lib/types/ListState";
import { Loader2 } from "lucide-react";
import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { aggregateSentimentData } from "./aggregateSentimentData";

interface TimeSeriesPoint {
  day: string;
  avg_pos: number | null;
  avg_neg: number | null;
  avg_mix: number | null;
  avg_neutral: number | null;
  count: number;
}

interface SentimentChartProps {
  dailyDataState: ListState<DailySentimentData>;
  keyword: string | null;
  drilldownSentiment: string | null;
  chartHeight?: number;
}

// Define fixed order and colors (should match Distribution chart)
const SENTIMENT_ORDER = ["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"];
const SENTIMENT_COLORS: { [key: string]: string } = {
  POSITIVE: "#34D399",
  NEGATIVE: "#F87171",
  NEUTRAL: "#60A5FA",
  MIXED: "#FBBF24",
  UNKNOWN: "#9CA3AF",
};

const calculateTimeSeriesData = (
  data: DailySentimentData[],
  selectedKeyword: string
): TimeSeriesPoint[] => {
  const filteredData = data.filter((item) =>
    selectedKeyword ? item.keyword === selectedKeyword : true
  );

  const chartData: TimeSeriesPoint[] = aggregateSentimentData(
    filteredData,
    "date"
  ).map((item) => ({
    day: item.group_key,
    avg_pos: item.avg_pos,
    avg_neg: item.avg_neg,
    avg_mix: item.avg_mix,
    avg_neutral: item.avg_neutral,
    count: item.count,
  }));

  return chartData;
};

/**
 * Timeseries chart for sentiment data.
 */
const SentimentTimeSeriesChart: React.FC<SentimentChartProps> = ({
  dailyDataState,
  keyword,
  drilldownSentiment,
  chartHeight = 280,
}) => {
  const { data: dailyData, loading, error } = dailyDataState;

  // Format the date for the X-axis tooltip/labels if needed (e.g., 'MMM D')
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateStr; // Fallback to original string if date is invalid
    }
  };

  // Generate title content (can be reused across states)
  const renderTitle = () => (
    <h3 className="text-xl font-semibold mb-4 text-blue-300 shrink-0 text-center">
      {keyword
        ? keyword
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ")
        : "Sentiment Trend"}
      {drilldownSentiment && (
        <span className="text-base font-normal text-gray-400 ml-2">
          ({drilldownSentiment} Only)
        </span>
      )}
    </h3>
  );

  if (loading)
    return (
      <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col items-center justify-center">
        {renderTitle()}
        <div
          style={{ minHeight: chartHeight }}
          className="flex items-center justify-center w-full"
        >
          <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
        </div>
      </div>
    );

  if (error)
    return (
      <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        {renderTitle()}
        <div
          style={{ minHeight: chartHeight }}
          className="flex flex-col items-center justify-center w-full"
        >
          <p className="text-red-500">Error loading chart data:</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    );

  if (!keyword)
    return (
      <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        {renderTitle()}
        <div
          style={{ minHeight: chartHeight }}
          className="flex items-center justify-center w-full"
        >
          <p className="text-gray-500">Select a keyword to view sentiment trend.</p>
        </div>
      </div>
    );

  const data = calculateTimeSeriesData(dailyData, keyword);

  // --- Empty/No Data State ---
  if (!keyword || !data || data.length === 0) {
    return (
      <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        {renderTitle()}
        <div
          style={{ minHeight: chartHeight }}
          className="flex items-center justify-center w-full"
        >
          <p className="text-gray-500">
            {!keyword
              ? "Select a keyword and date range to view sentiment trend."
              : `No timeseries data available for "${keyword}".`}
          </p>
        </div>
      </div>
    );
  }

  // Determine which data keys to render based on drilldown
  const linesToRender = !drilldownSentiment
    ? SENTIMENT_ORDER
    : [drilldownSentiment.toUpperCase()];

  // Helper function to get dataKey from sentiment name
  const getDataKey = (
    sentiment: string
  ): keyof Omit<TimeSeriesPoint, "day" | "count"> | null => {
    switch (sentiment.toUpperCase()) {
      case "POSITIVE":
        return "avg_pos";
      case "NEGATIVE":
        return "avg_neg";
      case "NEUTRAL":
        return "avg_neutral";
      case "MIXED":
        return "avg_mix";
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col">
      {renderTitle()}
      <div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDate}
              stroke="#9CA3AF"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 1]}
              stroke="#9CA3AF"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toFixed(1)} // Format to 1 decimal place
              width={25} // Reduce YAxis width
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "none",
                borderRadius: "4px",
              }}
              labelFormatter={formatDate}
              formatter={(value: number, name: string) => [
                value.toFixed(4),
                name,
              ]}
            />
            {linesToRender.map((sentiment) => {
              const dataKey = getDataKey(sentiment);
              if (!dataKey) return null;
              return (
                <Line
                  key={sentiment}
                  type="monotone"
                  dataKey={dataKey}
                  name={
                    sentiment.charAt(0).toUpperCase() +
                    sentiment.slice(1).toLowerCase()
                  }
                  stroke={SENTIMENT_COLORS[sentiment]}
                  strokeWidth={2}
                  dot={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SentimentTimeSeriesChart;
