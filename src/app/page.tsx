"use client"; // Add this directive for client-side fetching and state

import { useState, useEffect } from 'react';
import SentimentChart from '@/components/SentimentChart'; // Import the new chart component
import { KeywordSelector } from '@/components/KeywordSelector'; // Import the keyword selector

// Define an interface for the data structure returned by the API
interface SentimentData {
  keyword: string;
  avg_pos: number;
  avg_neg: number;
  avg_mix: number;
  count: number;
}

// Add interface for timeseries data points
interface TimeseriesDataPoint {
  day: string;
  avg_pos?: number | null;
  avg_neg?: number | null;
  avg_mix?: number | null;
  count?: number | null;
}

// Reusable component for displaying a list of games
const SentimentList: React.FC<{ title: string; data: SentimentData[]; loading: boolean; error: string | null; metric: 'avg_pos' | 'avg_neg'; colorClass: string; }> = 
  ({ title, data, loading, error, metric, colorClass }) => {
    
    if (loading) return <p className="text-center text-gray-400 py-4">Loading {title.toLowerCase()}...</p>;
    if (error) return <p className="text-center text-red-500 py-4">Error loading {title.toLowerCase()}: {error}</p>;
    if (!data || data.length === 0) return <p className="text-center text-gray-500 py-4">No data available for {title.toLowerCase()}.</p>;

    return (
      <div className="bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 className={`text-2xl font-semibold mb-4 ${colorClass}`}>{title}</h2>
        <ul className="space-y-3">
          {data.map((item, index) => (
            <li key={item.keyword} className="p-4 bg-gray-700 rounded shadow flex justify-between items-center">
              <span className="font-medium text-lg">{index + 1}. {item.keyword}</span>
              <div className="text-right text-sm">
                <span className={`${colorClass} block`}>
                  {metric === 'avg_neg' ? 'Avg Negative' : 'Avg Positive'}: {item[metric].toFixed(4)}
                </span>
                <span className="text-gray-400 block">Count: {item.count}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
};

export default function Home() {
  // State for lists
  const [negativeData, setNegativeData] = useState<SentimentData[]>([]);
  const [negativeLoading, setNegativeLoading] = useState<boolean>(true);
  const [negativeError, setNegativeError] = useState<string | null>(null);
  const [positiveData, setPositiveData] = useState<SentimentData[]>([]);
  const [positiveLoading, setPositiveLoading] = useState<boolean>(true);
  const [positiveError, setPositiveError] = useState<string | null>(null);

  // State for keywords
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState<boolean>(true);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null); // Initially null

  // State for chart data
  const [chartData, setChartData] = useState<TimeseriesDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false); // Start false, load only when keyword selected
  const [chartError, setChartError] = useState<string | null>(null);

  // Make fetchData generic
  const fetchData = async <T,>(
    url: string,
    setData: React.Dispatch<React.SetStateAction<T>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    // Add dataType to handle different response structures
    dataType: 'keywords' | 'sentiment' | 'timeseries',
    isChartData: boolean = false
  ) => {
    setLoading(true);
    setError(null);
    // Clear previous chart data specifically if fetching new chart data
    if (isChartData) setChartData([]);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 400 && isChartData) {
             throw new Error("Please select a keyword to view its trend.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json(); // result is implicitly any here
      if (result.error) {
        throw new Error(result.details || result.error);
      }
      
      // Extract data based on dataType and cast to T
      let extractedData: T;
      if (dataType === 'keywords') {
          extractedData = (result.keywords || []) as T;
      } else { // 'sentiment' or 'timeseries' expect result.data
          extractedData = (result.data || []) as T;
      }
      setData(extractedData);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
      console.error(`Fetch Error (${url}):`, e);
      // Clear specific state on error only if it makes sense (e.g., chart)
      if (isChartData) setChartData([]); 
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch initial lists and keywords - specify types and dataType
  useEffect(() => {
    fetchData<SentimentData[]>('/api/sentiment?metric=avg_neg&order=desc&limit=20&days=30', setNegativeData, setNegativeLoading, setNegativeError, 'sentiment');
    fetchData<SentimentData[]>('/api/sentiment?metric=avg_pos&order=desc&limit=20&days=30', setPositiveData, setPositiveLoading, setPositiveError, 'sentiment');
    fetchData<string[]>('/api/keywords?days=30', setKeywords, setKeywordsLoading, setKeywordsError, 'keywords');
  }, []); // Runs once on mount

  // Effect to fetch chart data WHEN selectedKeyword changes - specify types and dataType
  useEffect(() => {
    if (selectedKeyword) {
      fetchData<TimeseriesDataPoint[]>(
        `/api/sentiment/timeseries?keyword=${encodeURIComponent(selectedKeyword)}&days=30`,
        setChartData,
        setChartLoading,
        setChartError,
        'timeseries', // Specify data type
        true // Indicate this is for chart data
      );
    } else {
      setChartData([]);
      setChartLoading(false);
      setChartError(null);
    }
  }, [selectedKeyword]); 

  // Effect to set default keyword AFTER positive list loads (if none selected yet)
  useEffect(() => {
      if (!positiveLoading && positiveData.length > 0 && !selectedKeyword && !keywordsLoading) {
          // Ensure keywords have also loaded to avoid race conditions if user clicks fast
          if (keywords.includes(positiveData[0].keyword)) {
            setSelectedKeyword(positiveData[0].keyword);
          } else {
            // Fallback if top positive game isn't in the keyword list for some reason
            console.warn("Top positive game not found in distinct keywords list.");
          }
      }
  }, [positiveData, positiveLoading, selectedKeyword, keywords, keywordsLoading]); // Add dependencies

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 md:p-12 bg-gray-900 text-white">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Game Sentiment Dashboard</h1>

      {/* Chart Section (Moved Up) */}
      <div className="w-full max-w-6xl mb-8">
        <div className="flex justify-center mb-4">
           <KeywordSelector 
              keywords={keywords}
              selectedKeyword={selectedKeyword}
              onKeywordSelect={setSelectedKeyword}
              loading={keywordsLoading}
              className="z-10" // Ensure dropdown appears above chart if overlapping
           />
        </div>
         {/* Display errors from keyword loading */} 
         {keywordsError && <p className="text-center text-red-500 py-2">Error loading keywords: {keywordsError}</p>}
         
          {/* Chart display logic */} 
          {chartLoading && <div className="text-center text-gray-400 py-10">Loading chart data...</div>}
          {chartError && !chartLoading && <div className="text-center text-red-500 py-10">Error loading chart: {chartError}</div>}
          
          {!chartLoading && !chartError && selectedKeyword && chartData.length > 0 && (
            <SentimentChart data={chartData} keyword={selectedKeyword} />
          )}
          {/* Show message if no keyword is selected yet, or if a selected keyword returned no data */}
          {!selectedKeyword && !chartLoading && !keywordsLoading && (
              <div className="bg-gray-800 shadow-lg rounded-lg p-6 text-center text-gray-500 h-[374px] flex items-center justify-center"> {/* Match approx chart height */} 
                  Select a keyword above to view its sentiment trend.
              </div>
          )}
           {!chartLoading && !chartError && selectedKeyword && chartData.length === 0 && (
               <div className="bg-gray-800 shadow-lg rounded-lg p-6 text-center text-gray-500 h-[374px] flex items-center justify-center">
                  No timeseries data found for &quot;{selectedKeyword}&quot; in the selected period.
              </div>
           )}
      </div>

      {/* Grid layout for the two lists (Now Below Chart) */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <SentimentList 
          title="Top 20 Most Negative Games (Last 30 Days)"
          data={negativeData}
          loading={negativeLoading}
          error={negativeError}
          metric="avg_neg"
          colorClass="text-red-400"
        />
        <SentimentList 
          title="Top 20 Most Positive Games (Last 30 Days)"
          data={positiveData}
          loading={positiveLoading}
          error={positiveError}
          metric="avg_pos"
          colorClass="text-green-400"
        />
      </div>
    </main>
  );
}
