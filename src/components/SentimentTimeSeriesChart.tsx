"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LegendType,
} from "recharts";
import { TimeseriesDataPoint } from "@/lib/types/sentiment";

interface SentimentChartProps {
  data: TimeseriesDataPoint[];
  keyword: string;
  drilldownSentiment: string | null;
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

/**
 * Timeseries chart for sentiment data.
 */
const SentimentTimeSeriesChart: React.FC<SentimentChartProps> = ({
  data,
  keyword,
  drilldownSentiment,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No timeseries data available for &quot;{keyword}&quot;.
      </div>
    );
  }

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

  // Prepare legend payload - only include active sentiment if drilled down
  const legendPayload = (
    !drilldownSentiment ? SENTIMENT_ORDER : [drilldownSentiment]
  )
    .filter((sentiment) => SENTIMENT_ORDER.includes(sentiment.toUpperCase())) // Ensure valid sentiments
    .map((sentimentUpper) => ({
      value:
        sentimentUpper.charAt(0).toUpperCase() +
        sentimentUpper.slice(1).toLowerCase(),
      type: "line" as LegendType,
      id: sentimentUpper,
      color: SENTIMENT_COLORS[sentimentUpper] || SENTIMENT_COLORS.UNKNOWN,
    }));

  // Determine which data keys to render based on drilldown
  const linesToRender = !drilldownSentiment
    ? SENTIMENT_ORDER
    : [drilldownSentiment.toUpperCase()];

  // Helper function to get dataKey from sentiment name
  const getDataKey = (sentiment: string): keyof TimeseriesDataPoint | null => {
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
    <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-blue-300 shrink-0 text-center">
        {/**Camel Case */}
        {keyword
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ")}
        {drilldownSentiment && (
          <span className="text-base font-normal text-gray-400 ml-2">
            ({drilldownSentiment} Only)
          </span>
        )}
      </h3>
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDate}
              stroke="#9CA3AF"
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, 1]} stroke="#9CA3AF" tick={{ fontSize: 12 }} />
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
            <Legend
              payload={legendPayload}
              wrapperStyle={{ paddingTop: "15px" }}
              align="center"
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
