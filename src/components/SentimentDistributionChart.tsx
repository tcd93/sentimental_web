import { useDailyData } from "@/contexts/DailyDataProvider";
import { aggregateSentimentDataByKeyword } from "@/lib/types/Aggregators";
import { DailySentimentData } from "@/lib/types/DailySentimentData";
import assert from "assert";
import { Loader2 } from "lucide-react";
import React, { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

interface SentimentDistributionChartProps {
  drilldownSentiment: string | null;
  onSentimentSelect: (sentiment: string | null) => void;
  chartHeight?: number;
}

// Define colors for each sentiment category
const SENTIMENT_COLORS: { [key: string]: string } = {
  POSITIVE: "#34D399", // green-400
  NEGATIVE: "#F87171", // red-400
  NEUTRAL: "#60A5FA", // blue-400 (Ensure this matches Line chart)
  MIXED: "#FBBF24", // amber-400
  UNKNOWN: "#9CA3AF", // gray-400
};

// Define fixed order for legend and sorting
const SENTIMENT_ORDER = ["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"];

interface DistributionPoint {
  sentiment: string;
  avg_value: number;
  count: number;
}

const calculateDistributionData = (
  data: DailySentimentData[],
  selectedKeyword: string | null
): DistributionPoint[] => {
  if (!selectedKeyword) return [];

  const filteredData = data.filter((item) => item.keyword === selectedKeyword);

  if (filteredData.length === 0) {
    console.warn(
      `No data found for keyword "${selectedKeyword}" in calculateDistributionData`
    );
    return [];
  }

  const aggregatedData = aggregateSentimentDataByKeyword(filteredData);

  assert(
    aggregatedData.length === 1,
    `Expected exactly one item in aggregatedData for keyword "${selectedKeyword}"`
  );

  const item = aggregatedData[0];

  return [
    {
      sentiment: "Positive",
      avg_value: item.avg_pos ?? 0,
      count: item.pos_count ?? 0,
    },
    {
      sentiment: "Negative",
      avg_value: item.avg_neg ?? 0,
      count: item.neg_count ?? 0,
    },
    {
      sentiment: "Mixed",
      avg_value: item.avg_mix ?? 0,
      count: item.mix_count ?? 0,
    },
    {
      sentiment: "Neutral",
      avg_value: item.avg_neutral ?? 0,
      count: item.neutral_count ?? 0,
    },
  ];
};

const SentimentDistributionChart: React.FC<SentimentDistributionChartProps> = ({
  drilldownSentiment: selectedSentiment,
  onSentimentSelect,
  chartHeight = 280,
}) => {
  const { dailyDataState, selectedKeyword } = useDailyData();
  const { data: dailyData, loading, error } = dailyDataState;

  const data = useMemo(() => {
    return calculateDistributionData(dailyData, selectedKeyword);
  }, [dailyData, selectedKeyword]);

  if (loading)
    return (
      <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col items-center justify-center">
        <h3 className="text-xl font-semibold mb-4 text-blue-300">
          Distribution
        </h3>
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
        <h3 className="text-xl font-semibold mb-4 text-blue-300">
          Distribution
        </h3>
        <div
          style={{ minHeight: chartHeight }}
          className="flex flex-col items-center justify-center w-full"
        >
          <p className="text-red-500">Error loading distribution:</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    );

  if (!selectedKeyword)
    return (
      <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <h3 className="text-xl font-semibold mb-4 text-blue-300">
          Distribution
        </h3>
        <div
          style={{ minHeight: chartHeight }}
          className="flex items-center justify-center w-full"
        >
          <p className="text-gray-500">Select a keyword to see distribution.</p>
        </div>
      </div>
    );

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <h3 className="text-xl font-semibold mb-4 text-blue-300">
          Distribution
        </h3>
        <div
          style={{ minHeight: chartHeight }}
          className="flex items-center justify-center w-full"
        >
          <p className="text-gray-500">
            {`No distribution data available for "${selectedKeyword}".`}
          </p>
        </div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    const indexA = SENTIMENT_ORDER.indexOf(a.sentiment.toUpperCase());
    const indexB = SENTIMENT_ORDER.indexOf(b.sentiment.toUpperCase());
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const total = sortedData.reduce((sum, entry) => sum + entry.count, 0);

  const renderCustomTooltip = (props: TooltipProps<ValueType, NameType>) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const entryPayload = payload[0].payload as DistributionPoint;
      const percentage =
        total > 0 ? ((entryPayload.count / total) * 100).toFixed(1) : 0;
      const sentimentUpper = entryPayload.sentiment.toUpperCase();
      const avgScore = entryPayload.avg_value;

      return (
        <div className="bg-gray-900/80 backdrop-blur-sm text-gray-200 p-2 rounded shadow-lg border border-gray-700 text-sm">
          <p
            className="font-semibold"
            style={{
              color:
                SENTIMENT_COLORS[sentimentUpper] || SENTIMENT_COLORS.UNKNOWN,
            }}
          >
            {entryPayload.sentiment}
          </p>
          <p>{`Count: ${entryPayload.count}`}</p>
          <p>{`Percent: ${percentage}%`}</p>
          <p>{`Avg Score: ${avgScore.toFixed(4)}`}</p>
        </div>
      );
    }
    return null;
  };

  const handlePieClick = (
    clickedData: DistributionPoint | { payload: DistributionPoint }
  ) => {
    const entryPayload =
      "payload" in clickedData ? clickedData.payload : clickedData;
    const clickedSentiment = entryPayload?.sentiment?.toUpperCase();
    if (!clickedSentiment) return;

    if (clickedSentiment === selectedSentiment?.toUpperCase()) {
      onSentimentSelect(null);
    } else {
      onSentimentSelect(clickedSentiment);
    }
  };

  return (
    <div className="bg-gray-800 shadow-lg rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-blue-300 text-center">
        Distribution
      </h3>
      <div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              innerRadius={40}
              outerRadius={Math.min(100, chartHeight / 2 - 30)}
              paddingAngle={1}
              fill="#8884d8"
              dataKey="count"
              nameKey="sentiment"
              onClick={handlePieClick}
              className="cursor-pointer focus:outline-none focus:ring-0"
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    SENTIMENT_COLORS[entry.sentiment.toUpperCase()] ||
                    SENTIMENT_COLORS.UNKNOWN
                  }
                  stroke={
                    selectedSentiment &&
                    entry.sentiment.toUpperCase() ===
                      selectedSentiment.toUpperCase()
                      ? "#FFFFFF"
                      : "none"
                  }
                  strokeWidth={2}
                  opacity={
                    selectedSentiment &&
                    entry.sentiment.toUpperCase() !==
                      selectedSentiment.toUpperCase()
                      ? 0.5
                      : 1
                  }
                  style={{ transition: "opacity 0.2s ease-in-out" }}
                />
              ))}
            </Pie>
            <Tooltip content={renderCustomTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SentimentDistributionChart;
