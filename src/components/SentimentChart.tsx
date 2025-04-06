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
} from 'recharts';

// Interface for the data points expected by the chart
interface ChartDataPoint {
  day: string;         // 'YYYY-MM-DD'
  avg_pos?: number | null;
  avg_neg?: number | null;
  avg_mix?: number | null;
  count?: number | null;
}

interface SentimentChartProps {
  data: ChartDataPoint[];
  keyword: string;
}

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

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-blue-300">Sentiment Trend: {keyword}</h3>
      {/* Use ResponsiveContainer to make the chart adapt to its parent size */}
      <ResponsiveContainer width="100%" height={300}> 
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" /> {/* Gray grid lines */}
          <XAxis 
             dataKey="day" 
             tickFormatter={formatDate} 
             stroke="#9CA3AF" // Gray axis line and ticks
             tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 1]} // Sentiment scores are between 0 and 1
            stroke="#9CA3AF" 
            tick={{ fontSize: 12 }}
           />
          <Tooltip 
             contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '4px' }} // Dark tooltip
             labelFormatter={formatDate}
             formatter={(value: number, name: string) => [value.toFixed(4), name]} // Format value in tooltip
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {/* Add a reference line at 0.5 if desired */}
          {/* <ReferenceLine y={0.5} stroke="#6B7280" strokeDasharray="3 3" /> */}
          
          {/* Lines for different sentiment scores */}
          <Line type="monotone" dataKey="avg_pos" name="Positive" stroke="#34D399" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avg_neg" name="Negative" stroke="#F87171" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avg_mix" name="Mixed" stroke="#FBBF24" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentChart; 