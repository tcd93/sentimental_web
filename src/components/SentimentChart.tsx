"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LegendType
} from 'recharts';

// Interface for the data points expected by the chart
interface ChartDataPoint {
  day: string;         // 'YYYY-MM-DD'
  avg_pos?: number | null;
  avg_neg?: number | null;
  avg_mix?: number | null;
  avg_neutral?: number | null;
  count?: number | null;
}

interface SentimentChartProps {
  data: ChartDataPoint[];
  keyword: string;
}

// Define fixed order and colors (should match Distribution chart)
const SENTIMENT_ORDER = ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'];
const SENTIMENT_COLORS: { [key: string]: string } = {
  POSITIVE: '#34D399', 
  NEGATIVE: '#F87171', 
  NEUTRAL: '#60A5FA',  
  MIXED: '#FBBF24',    
  UNKNOWN: '#9CA3AF'   
};

const SentimentChart: React.FC<SentimentChartProps> = ({ data, keyword }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-gray-500">No timeseries data available for &quot;{keyword}&quot;.</div>;
  }

  // Format the date for the X-axis tooltip/labels if needed (e.g., 'MMM D')
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr; // Fallback to original string if date is invalid
    }
  };

  // Prepare legend payload based on fixed order
  const legendPayload = SENTIMENT_ORDER.map(sentiment => ({
      value: sentiment.charAt(0).toUpperCase() + sentiment.slice(1).toLowerCase(), 
      type: 'line' as LegendType, // Use 'line' type for this chart
      id: sentiment,
      color: SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.UNKNOWN
  }));

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-full flex flex-col"> 
      <h3 className="text-xl font-semibold mb-4 text-blue-300 shrink-0">Sentiment Trend: {keyword}</h3> 
      <div className="flex-grow min-h-0">
          <ResponsiveContainer width="100%" height="100%"> 
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
              <XAxis dataKey="day" tickFormatter={formatDate} stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 1]} stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '4px' }} labelFormatter={formatDate} formatter={(value: number, name: string) => [value.toFixed(4), name]} />
              <Legend payload={legendPayload} wrapperStyle={{ paddingTop: '15px' }} align="center" />
              <Line type="monotone" dataKey="avg_pos" name="Positive" stroke={SENTIMENT_COLORS.POSITIVE} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avg_neg" name="Negative" stroke={SENTIMENT_COLORS.NEGATIVE} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avg_neutral" name="Neutral" stroke={SENTIMENT_COLORS.NEUTRAL} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avg_mix" name="Mixed" stroke={SENTIMENT_COLORS.MIXED} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SentimentChart; 