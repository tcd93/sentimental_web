"use client";

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  LegendType
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { SentimentSummary, DistributionDataPoint } from "@/lib/types/sentiment";

interface SentimentDistributionChartProps {
  data: DistributionDataPoint[];
  keyword: string;
  periodAverages: SentimentSummary | null;
  selectedSentiment: string | null;
  onSentimentSelect: (sentiment: string | null) => void;
}

// Define colors for each sentiment category
const SENTIMENT_COLORS: { [key: string]: string } = {
  POSITIVE: '#34D399', // green-400
  NEGATIVE: '#F87171', // red-400
  NEUTRAL: '#60A5FA',  // blue-400 (Ensure this matches Line chart)
  MIXED: '#FBBF24',    // amber-400
  UNKNOWN: '#9CA3AF'   // gray-400
};

// Define fixed order for legend and sorting
const SENTIMENT_ORDER = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'];

const SentimentDistributionChart: React.FC<SentimentDistributionChartProps> = ({ 
  data, 
  keyword, 
  periodAverages, 
  selectedSentiment,
  onSentimentSelect
}) => {

  if (!data || data.length === 0) {
    // You might want a different message or a placeholder visual here
    return <div className="text-center text-gray-500 py-4">No distribution data available for &quot;{keyword}&quot;.</div>;
  }

  // Sort data according to the fixed order
  const sortedData = [...data].sort((a, b) => {
      const indexA = SENTIMENT_ORDER.indexOf(a.sentiment.toUpperCase());
      const indexB = SENTIMENT_ORDER.indexOf(b.sentiment.toUpperCase());
      // Handle cases where sentiment might not be in the order list (put them last)
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
  });

  // Calculate total for percentage tooltip/label (use sortedData)
  const total = sortedData.reduce((sum, entry) => sum + entry.count, 0);

  // Custom tooltip formatter
  const renderCustomTooltip = (props: TooltipProps<ValueType, NameType>) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const entryPayload = payload[0].payload as DistributionDataPoint;
      const percentage = total > 0 ? ((entryPayload.count / total) * 100).toFixed(1) : 0;
      
      // Get the corresponding average score
      let avgScore: number | null | undefined = undefined;
      const sentimentUpper = entryPayload.sentiment.toUpperCase();
      if (periodAverages) {
          if (sentimentUpper === 'POSITIVE') avgScore = periodAverages.avg_pos;
          else if (sentimentUpper === 'NEGATIVE') avgScore = periodAverages.avg_neg;
          else if (sentimentUpper === 'MIXED') avgScore = periodAverages.avg_mix;
          else if (sentimentUpper === 'NEUTRAL') avgScore = periodAverages.avg_neutral;
      }

      return (
        <div className="bg-gray-900/80 backdrop-blur-sm text-gray-200 p-2 rounded shadow-lg border border-gray-700 text-sm">
          <p className="font-semibold" style={{ color: SENTIMENT_COLORS[sentimentUpper] || SENTIMENT_COLORS.UNKNOWN }}>{entryPayload.sentiment}</p>
          <p>{`Count: ${entryPayload.count}`}</p>
          <p>{`Percent: ${percentage}%`}</p>
          {/* Display average score if available */}
          {avgScore !== null && avgScore !== undefined && (
              <p>{`Avg Score: ${avgScore.toFixed(4)}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Prepare legend payload based on fixed order
  const legendPayload = SENTIMENT_ORDER.map(sentiment => ({
      value: sentiment.charAt(0).toUpperCase() + sentiment.slice(1).toLowerCase(),
      type: 'circle' as LegendType,
      id: sentiment,
      color: SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.UNKNOWN
  }));

  // Handle clicks on Pie slices
  const handlePieClick = (data: DistributionDataPoint) => {
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
    <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-blue-300">Sentiment Distribution: {keyword}</h3>
      <div className="flex-grow min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sortedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="count"
                nameKey="sentiment"
                onClick={handlePieClick}
                className="cursor-pointer focus:outline-none focus:ring-0"
              >
                {sortedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={SENTIMENT_COLORS[entry.sentiment.toUpperCase()] || SENTIMENT_COLORS.UNKNOWN} 
                    opacity={selectedSentiment && entry.sentiment.toUpperCase() !== selectedSentiment.toUpperCase() ? 0.4 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
              <Legend payload={legendPayload} wrapperStyle={{ paddingTop: '15px' }} align="center"/>
            </PieChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
};

export default SentimentDistributionChart;