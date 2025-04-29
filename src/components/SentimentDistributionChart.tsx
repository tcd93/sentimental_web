import { aggregateSentimentDataByKeyword } from "@/lib/types/Aggregators";
import { DailySentimentData } from "@/lib/types/DailySentimentData";
import { ListState } from "@/lib/types/ListState";
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
  dailyDataState: ListState<DailySentimentData>;
  keyword: string | null;
  selectedSentiment: string | null;
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
  selectedKeyword: string
): DistributionPoint[] => {
  const aggregatedData = aggregateSentimentDataByKeyword(
    data.filter((item) =>
      selectedKeyword ? item.keyword === selectedKeyword : true
    )
  );

  // should be only one item in filteredData
  assert(
    aggregatedData.length === 1,
    "Expected exactly one item in aggregatedData"
  );

  const item = aggregatedData[0];

  return [
    {
      sentiment: "Positive",
      avg_value: item.avg_pos,
      count: item.pos_count ?? 0,
    },
    {
      sentiment: "Negative",
      avg_value: item.avg_neg,
      count: item.neg_count ?? 0,
    },
    {
      sentiment: "Mixed",
      avg_value: item.avg_mix,
      count: item.mix_count ?? 0,
    },
    {
      sentiment: "Neutral",
      avg_value: item.avg_neutral,
      count: item.neutral_count ?? 0,
    },
  ];
};

const SentimentDistributionChart: React.FC<SentimentDistributionChartProps> = ({
  dailyDataState,
  keyword,
  selectedSentiment,
  onSentimentSelect,
  chartHeight = 280, // Default height if not provided
}) => {
  const { data: dailyData, loading, error } = dailyDataState;

  const data = useMemo(() => {
    if (dailyData.length === 0 || !keyword) return [];
    return calculateDistributionData(dailyData, keyword);
  }, [dailyData, keyword]);

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

  if (!keyword)
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
  // --- Empty/No Data State ---
  if (!keyword || !data || data.length === 0) {
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
            {!keyword
              ? "Select a keyword to see distribution."
              : `No distribution data available for "${keyword}".`}
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

  // Handle clicks on Pie slices
  const handlePieClick = (data: DistributionPoint) => {
    const clickedSentiment = data?.sentiment?.toUpperCase();
    if (!clickedSentiment) return;

    // If clicking the already selected slice, deselect (reset drilldown)
    if (clickedSentiment === selectedSentiment?.toUpperCase()) {
      onSentimentSelect(null);
    } else {
      onSentimentSelect(clickedSentiment); // Set drilldown to clicked sentiment
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
              fill="#8884d8"
              dataKey="count"
              nameKey="sentiment"
              onClick={handlePieClick}
              className="cursor-pointer focus:outline-none focus:ring-0"
              isAnimationActive={false}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    SENTIMENT_COLORS[entry.sentiment.toUpperCase()] ||
                    SENTIMENT_COLORS.UNKNOWN
                  }
                  opacity={
                    selectedSentiment &&
                    entry.sentiment.toUpperCase() !==
                      selectedSentiment.toUpperCase()
                      ? 0.4
                      : 1
                  }
                />
              ))}
            </Pie>
            <Tooltip
              content={renderCustomTooltip}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 100 }}
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SentimentDistributionChart;
