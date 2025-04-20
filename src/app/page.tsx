"use client"; // Add this directive for client-side fetching and state

import { useState, useEffect, useCallback } from 'react';
import SentimentChart from '@/components/SentimentChart'; // Import the new chart component
import { KeywordSelector } from '@/components/KeywordSelector'; // Import the keyword selector
import { Loader2 } from 'lucide-react'; // <-- Import Loader2 icon
import SentimentDistributionChart from '@/components/SentimentDistributionChart'; // <-- Import the new chart

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

// Add interface for distribution data points
interface DistributionDataPoint {
  sentiment: string;
  count: number;
}

// Define the interface for props including the click handler
interface SentimentListProps {
    title: string;
    data: SentimentData[];
    loading: boolean;
    error: string | null;
    metric: 'avg_pos' | 'avg_neg';
    colorClass: string;
    onKeywordClick: (keyword: string) => void; // Add this prop
}

// Interface for Overall Period Averages (matches SentimentSummary from API)
interface PeriodAverages {
    keyword: string; // Keep keyword for potential future use
    avg_pos: number | null;
    avg_neg: number | null;
    avg_mix: number | null;
    avg_neutral: number | null;
    count: number;
}

// Define the possible types for the state setters that might be cleared
type DataSetter = 
    React.Dispatch<React.SetStateAction<TimeseriesDataPoint[]>> | 
    React.Dispatch<React.SetStateAction<DistributionDataPoint[]>> | 
    React.Dispatch<React.SetStateAction<SentimentData[]>>; // Add list data type if needed

// Reusable component for displaying a list of games
const SentimentList: React.FC<SentimentListProps> = // Update type usage
  ({ title, data, loading, error, metric, colorClass, onKeywordClick }) => { // Destructure new prop
    
    // Replace text loading with a detailed skeleton placeholder
    if (loading) return (
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-96 w-full">
            {/* Skeleton Title */}
            <div className="h-6 bg-gray-700 rounded w-1/2 mb-6 animate-pulse"></div>
            {/* Skeleton List Items */}
            <div className="space-y-3">
                <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-12 bg-gray-700 rounded animate-pulse"></div> 
            </div>
        </div>
    );
    if (error) return (
        // Also style error state similarly for consistency
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-96 w-full flex items-center justify-center text-center text-red-500">
             Error loading {title.toLowerCase()}: {error}
        </div>
    ); 
    if (!data || data.length === 0) return (
        // And the no data state
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
              className="p-4 bg-gray-700 rounded shadow flex justify-between items-center transition-colors duration-150 hover:bg-gray-600/80 cursor-pointer" // Add hover effect and cursor
              onClick={() => onKeywordClick(item.keyword)} // Add onClick handler
            >
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

  // State for Distribution Chart
  const [distributionData, setDistributionData] = useState<DistributionDataPoint[]>([]);
  const [distributionLoading, setDistributionLoading] = useState<boolean>(false);
  const [distributionError, setDistributionError] = useState<string | null>(null);

  // State for Overall Period Averages (single object or null)
  const [selectedKeywordPeriodAverages, setSelectedKeywordPeriodAverages] = useState<PeriodAverages | null>(null);
  // State for temporary API result
  const [periodAveragesApiResult, setPeriodAveragesApiResult] = useState<PeriodAverages[]>([]); 

  // State for Drilldown
  const [drilldownSentiment, setDrilldownSentiment] = useState<string | null>(null);

  // State for Date Range
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    return date.toISOString().split('T')[0]; // Default to today
  });

  // Update fetchData generic type to include distribution and use the specific union type
  const fetchData = useCallback(async <T,>(
    url: string,
    setData: React.Dispatch<React.SetStateAction<T>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    dataType: 'keywords' | 'sentiment' | 'timeseries' | 'distribution',
    // Use the defined union type for the setter function
    clearPreviousDataTarget?: DataSetter 
  ) => {
    setLoading(true);
    setError(null);
    // Clear previous data if specified
    // TypeScript should correctly infer the type when calling with []
    if (clearPreviousDataTarget) clearPreviousDataTarget([]);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Special handling for 400 on chart/distribution fetch (likely missing keyword/dates)
        if (response.status === 400 && (dataType === 'timeseries' || dataType === 'distribution')) {
             throw new Error("Please select a keyword and date range.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json(); 
      if (result.error) {
        throw new Error(result.details || result.error);
      }
      
      let extractedData: T;
      if (dataType === 'keywords') {
          extractedData = (result.keywords || []) as T;
      } else { // 'sentiment', 'timeseries', or 'distribution' expect result.data
          extractedData = (result.data || []) as T;
      }
      setData(extractedData);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
      console.error(`Fetch Error (${url}):`, e);
      // Clear specific state on error if specified
      if (clearPreviousDataTarget) clearPreviousDataTarget([]); 
    } finally {
      setLoading(false);
    }
  // Add setters used inside as dependencies of useCallback
  }, []); 

  // Effect to fetch lists and keywords (remains the same)
  useEffect(() => {
    // Construct URLs with date range for lists
    const listParams = `?limit=20&startDate=${startDate}&endDate=${endDate}`;
    const negUrl = `/api/sentiment${listParams}&metric=avg_neg&order=desc`;
    const posUrl = `/api/sentiment${listParams}&metric=avg_pos&order=desc`;
    // Keyword fetch doesn't need date range (fetches all distinct keywords for selector)
    const keywordsUrl = '/api/keywords'; 

    fetchData<SentimentData[]>(negUrl, setNegativeData, setNegativeLoading, setNegativeError, 'sentiment');
    fetchData<SentimentData[]>(posUrl, setPositiveData, setPositiveLoading, setPositiveError, 'sentiment');
    fetchData<string[]>(keywordsUrl, setKeywords, setKeywordsLoading, setKeywordsError, 'keywords');

  // Add startDate and endDate to dependency array
  }, [fetchData, startDate, endDate]);

  // Effect to fetch chart, distribution, and period averages array data
  useEffect(() => {
    // Clear all states
    setChartData([]);
    setDistributionData([]);
    setPeriodAveragesApiResult([]); 
    setSelectedKeywordPeriodAverages(null); 
    setDrilldownSentiment(null); // <-- Reset drilldown on new fetch
    
    // Set loading states (only for charts being displayed)
    if (selectedKeyword && startDate && endDate) {
      setChartLoading(true);
      setDistributionLoading(true); 
    } else {
       setChartLoading(false);
       setDistributionLoading(false);
    }

    if (selectedKeyword && startDate && endDate) {
        const baseParams = `keyword=${encodeURIComponent(selectedKeyword)}&startDate=${startDate}&endDate=${endDate}`;
        const timeseriesUrl = `/api/sentiment/timeseries?${baseParams}`;
        const distributionUrl = `/api/sentiment/distribution?${baseParams}`;
        // Fetch into the temporary array state
        const periodAveragesUrl = `/api/sentiment?${baseParams}&limit=1`; 

        fetchData<TimeseriesDataPoint[]>(
            timeseriesUrl, setChartData, setChartLoading, setChartError, 'timeseries'
        );
        fetchData<DistributionDataPoint[]>(
            distributionUrl, setDistributionData, setDistributionLoading, setDistributionError, 'distribution'
        );
        // Fetch data into the temporary array state (pass dummy/null for loading/error setters)
        fetchData<PeriodAverages[]>(
            periodAveragesUrl, 
            setPeriodAveragesApiResult, 
            () => {}, // No-op for loading setter
            () => {}, // No-op for error setter
            'sentiment' 
        );

    } else {
      // Clear errors
      const errorMsg = selectedKeyword && (!startDate || !endDate) ? "Please select both a start and end date." : null;
      setChartError(errorMsg);
      setDistributionError(errorMsg); 
    }
  }, [selectedKeyword, startDate, endDate, fetchData]);

  // New Effect: Update single period average object when the API array result changes
  useEffect(() => {
      if (periodAveragesApiResult && periodAveragesApiResult.length > 0) {
          setSelectedKeywordPeriodAverages(periodAveragesApiResult[0]);
      } else {
          // Ensure it's cleared if the API returns an empty array or undefined
          setSelectedKeywordPeriodAverages(null);
      }
  }, [periodAveragesApiResult]); // Run whenever the temporary array updates

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

  // Helper function to format date to YYYY-MM-DD
  const formatDateISO = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Function to handle date preset button clicks
  const handleDatePreset = (preset: '7d' | '30d' | '90d') => {
    const today = new Date();
    // Use const as newStartDate is not reassigned anymore
    const newStartDate = new Date(); 

    if (preset === '7d') {
      newStartDate.setDate(today.getDate() - 7);
    } else if (preset === '30d') {
      newStartDate.setDate(today.getDate() - 30);
    } else if (preset === '90d') {
      newStartDate.setDate(today.getDate() - 90);
    } 

    setStartDate(formatDateISO(newStartDate));
    setEndDate(formatDateISO(today));
  };

  // Helper function to format title based on date range
  const getListTitle = (baseTitle: string): string => {
    // Calculate if it's the default 30 days directly
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const defaultStart = formatDateISO(thirtyDaysAgo);
    const today = formatDateISO(new Date());
    const isDefault = startDate === defaultStart && endDate === today;

    if (isDefault) {
        return `${baseTitle} (Last 30 Days)`;
    }
    // Format dates for display (e.g., 'MMM D, YYYY')
    try {
        const startFormatted = new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const endFormatted = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        if (startDate === endDate) {
           return `${baseTitle} (${startFormatted})`; 
        }
        return `${baseTitle} (${startFormatted} - ${endFormatted})`;
    } catch (e) {
        console.error('Error formatting date for title:', e);
        return `${baseTitle} (Custom Range)`; // Fallback
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 md:p-12 bg-gray-900 text-white">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Game Sentiment Dashboard</h1>

      {/* Add Title for Controls Section */}
      <div className="w-full max-w-6xl mb-2 text-center">
          <h2 className="text-lg font-semibold text-gray-400">Filters</h2>
      </div>
      {/* Controls Section: Keyword Selector and Date Range */}
      <div className="w-full max-w-6xl mb-6 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 flex-wrap">
          <KeywordSelector 
              keywords={keywords}
              selectedKeyword={selectedKeyword}
              onKeywordSelect={setSelectedKeyword}
              loading={keywordsLoading}
              className="z-10" // Ensure dropdown appears above chart if overlapping
          />
          {/* Display errors from keyword loading */} 
          {keywordsError && <p className="text-center text-red-500 py-2">Error loading keywords: {keywordsError}</p>}

          {/* Date Range Picker & Presets Container */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
              {/* Custom Date Inputs */}
              <div className="flex items-center gap-2">
                  <label htmlFor="startDate" className="text-sm text-gray-400">From:</label>
                  <input 
                      type="date" 
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                  />
                  <label htmlFor="endDate" className="text-sm text-gray-400">To:</label>
                  <input 
                      type="date" 
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate} 
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                  />
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-2">
                  {(['7d', '30d', '90d'] as const).map((preset) => (
                      <button
                          key={preset}
                          onClick={() => handleDatePreset(preset)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-150 h-9"
                      >
                          {preset.toUpperCase()}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Charts Section - Grid Layout */} 
      <div className="w-full max-w-6xl mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Line Chart Container - Add fixed height */} 
          <div className="lg:col-span-2 h-[374px]">
             {/* Line Chart display logic (using chartLoading, chartError, chartData) */}
             {chartLoading && (
                <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
                </div>
             )}
             {chartError && !chartLoading && (
                 <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center text-center text-red-500">
                     Error loading chart: {chartError}
                </div>
             )}
             {!chartLoading && !chartError && selectedKeyword && startDate && endDate && chartData.length > 0 && (
               <SentimentChart 
                  data={chartData} 
                  keyword={selectedKeyword} 
                  // Pass drilldown state
                  drilldownSentiment={drilldownSentiment}
                />
             )}
             {/* Placeholder/Message when no chart data to show */}
             {(!selectedKeyword || !startDate || !endDate || (!chartLoading && !chartError && chartData.length === 0)) && !chartLoading && (
                 <div className="bg-gray-800 shadow-lg rounded-lg p-6 text-center text-gray-500 h-full flex items-center justify-center">
                     {(!selectedKeyword || !startDate || !endDate) 
                         ? "Select a keyword and a date range to view sentiment trend."
                         : `No timeseries data found for "${selectedKeyword || ''}" in the selected date range.` // Added null check for keyword
                     }
                 </div>
             )}
          </div>

          {/* Distribution Chart Container - Add fixed height */} 
          <div className="lg:col-span-1 h-[374px]">
            {/* Distribution Chart display logic (using distributionLoading, distributionError, distributionData) */}
            {distributionLoading && (
                <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                </div>
             )}
             {distributionError && !distributionLoading && (
                 <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center text-center text-red-500">
                     Error loading distribution: {distributionError}
                </div>
             )}
             {!distributionLoading && !distributionError && selectedKeyword && startDate && endDate && distributionData.length > 0 && (
               <SentimentDistributionChart 
                  data={distributionData} 
                  keyword={selectedKeyword} 
                  periodAverages={selectedKeywordPeriodAverages} 
                  // Pass state and setter for drilldown
                  selectedSentiment={drilldownSentiment}
                  onSentimentSelect={setDrilldownSentiment}
                />
             )}
             {/* Placeholder/Message when no distribution data to show */}
             {(!selectedKeyword || !startDate || !endDate || (!distributionLoading && !distributionError && distributionData.length === 0)) && !distributionLoading && (
                  <div className="bg-gray-800 shadow-lg rounded-lg p-6 text-center text-gray-500 h-full flex items-center justify-center">
                     {(!selectedKeyword || !startDate || !endDate) 
                         ? "Select keyword/dates."
                         : `No distribution data found.`
                     }
                 </div>
             )}
          </div>
      </div>

      {/* Grid layout for the two lists (Now Below Chart) */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <SentimentList 
          // Use helper function for dynamic title
          title={getListTitle("Top 20 Most Negative Games")}
          data={negativeData}
          loading={negativeLoading}
          error={negativeError}
          metric="avg_neg"
          colorClass="text-red-400"
          onKeywordClick={setSelectedKeyword} 
        />
        <SentimentList 
          // Use helper function for dynamic title
          title={getListTitle("Top 20 Most Positive Games")}
          data={positiveData}
          loading={positiveLoading}
          error={positiveError}
          metric="avg_pos"
          colorClass="text-green-400"
          onKeywordClick={setSelectedKeyword} 
        />
      </div>
    </main>
  );
}
