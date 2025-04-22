"use client"; // Add this directive for client-side fetching and state

import { useReducer, useState, useEffect, useCallback } from "react";
import SentimentChart from "@/components/SentimentChart"; // Import the new chart component
import { KeywordSelector } from "@/components/KeywordSelector"; // Import the keyword selector
import { Loader2 } from "lucide-react"; // <-- Import Loader2 icon
import SentimentDistributionChart from "@/components/SentimentDistributionChart"; // <-- Import the new chart
import SentimentList from "@/components/SentimentList";
import DateRangeControls from "@/components/DateRangeControls";
import { listReducer, ListAction } from "@/lib/reducers/listReducer";

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

// Interface for Overall Period Averages (matches SentimentSummary from API)
interface PeriodAverages {
  keyword: string; // Keep keyword for potential future use
  avg_pos: number | null;
  avg_neg: number | null;
  avg_mix: number | null;
  avg_neutral: number | null;
  count: number;
}

export default function Home() {
  // State for lists
  const [negativeList, dispatchNegativeList] = useReducer(
    listReducer<SentimentData>,
    { data: [], loading: true, error: null }
  );
  const [positiveList, dispatchPositiveList] = useReducer(
    listReducer<SentimentData>,
    { data: [], loading: true, error: null }
  );
  const [keywordsList, dispatchKeywordsList] = useReducer(
    listReducer<string>,
    { data: [], loading: true, error: null }
  );

  // State for keywords
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null); // Initially null

  // State for chart data
  const [chartState, dispatchChartState] = useReducer(
    listReducer<TimeseriesDataPoint>,
    { data: [], loading: false, error: null }
  );

  // State for Distribution Chart
  const [distributionState, dispatchDistributionState] = useReducer(
    listReducer<DistributionDataPoint>,
    { data: [], loading: false, error: null }
  );

  // State for Overall Period Averages (single object or null)
  const [selectedKeywordPeriodAverages, setSelectedKeywordPeriodAverages] =
    useState<PeriodAverages | null>(null);
  // State for temporary API result
  const [periodAveragesApiResult, setPeriodAveragesApiResult] = useState<
    PeriodAverages[]
  >([]);

  // State for Drilldown
  const [drilldownSentiment, setDrilldownSentiment] = useState<string | null>(
    null
  );

  // State for Date Range
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    return date.toISOString().split("T")[0]; // Default to today
  });

  // Refactored fetchData to dispatch to reducers
  const fetchData = useCallback(
    async <T,>(
      url: string,
      dispatch: React.Dispatch<ListAction<T>>,
      dataType: "keywords" | "sentiment" | "timeseries" | "distribution"
    ) => {
      dispatch({ type: "loading" });
      try {
        const response = await fetch(url);
        if (!response.ok) {
          if (
            response.status === 400 &&
            (dataType === "timeseries" || dataType === "distribution")
          ) {
            throw new Error("Please select a keyword and date range.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.error) {
          throw new Error(result.details || result.error);
        }
        let extractedData: T[];
        if (dataType === "keywords") {
          extractedData = (result.keywords || []) as T[];
        } else {
          extractedData = (result.data || []) as T[];
        }
        dispatch({ type: "success", data: extractedData });
      } catch (e) {
        dispatch({
          type: "error",
          error: e instanceof Error ? e.message : "Failed to fetch data",
        });
        console.error(`Fetch Error (${url}):`, e);
      }
    },
    []
  );

  // Effect to fetch lists and keywords
  useEffect(() => {
    const listParams = `?limit=20&startDate=${startDate}&endDate=${endDate}`;
    const negUrl = `/api/sentiment${listParams}&metric=avg_neg&order=desc`;
    const posUrl = `/api/sentiment${listParams}&metric=avg_pos&order=desc`;
    const keywordsUrl = "/api/keywords";
    fetchData<SentimentData>(negUrl, dispatchNegativeList, "sentiment");
    fetchData<SentimentData>(posUrl, dispatchPositiveList, "sentiment");
    fetchData<string>(keywordsUrl, dispatchKeywordsList, "keywords");
  }, [fetchData, startDate, endDate]);

  // Effect to fetch chart, distribution, and period averages array data
  useEffect(() => {
    dispatchChartState({ type: "success", data: [] });
    dispatchDistributionState({ type: "success", data: [] });
    setPeriodAveragesApiResult([]);
    setSelectedKeywordPeriodAverages(null);
    setDrilldownSentiment(null);
    if (selectedKeyword && startDate && endDate) {
      const baseParams = `keyword=${encodeURIComponent(
        selectedKeyword
      )}&startDate=${startDate}&endDate=${endDate}`;
      const timeseriesUrl = `/api/sentiment/timeseries?${baseParams}`;
      const distributionUrl = `/api/sentiment/distribution?${baseParams}`;
      const periodAveragesUrl = `/api/sentiment?${baseParams}&limit=1`;
      fetchData<TimeseriesDataPoint>(
        timeseriesUrl,
        dispatchChartState,
        "timeseries"
      );
      fetchData<DistributionDataPoint>(
        distributionUrl,
        dispatchDistributionState,
        "distribution"
      );
      // Period averages: keep as is for now
      fetch(periodAveragesUrl)
        .then((res) => res.json())
        .then((result) => setPeriodAveragesApiResult(result.data || []))
        .catch(() => setPeriodAveragesApiResult([]));
    } else {
      const errorMsg =
        selectedKeyword && (!startDate || !endDate)
          ? "Please select both a start and end date."
          : null;
      if (errorMsg) {
        dispatchChartState({ type: "error", error: errorMsg });
        dispatchDistributionState({ type: "error", error: errorMsg });
      }
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
    if (
      !positiveList.loading &&
      positiveList.data.length > 0 &&
      !selectedKeyword &&
      !keywordsList.loading
    ) {
      // Ensure keywords have also loaded to avoid race conditions if user clicks fast
      if (keywordsList.data.includes(positiveList.data[0].keyword)) {
        setSelectedKeyword(positiveList.data[0].keyword);
      } else {
        // Fallback if top positive game isn't in the keyword list for some reason
        console.warn("Top positive game not found in distinct keywords list.");
      }
    }
  }, [positiveList, selectedKeyword, keywordsList]); // Add dependencies

  // Helper function to format date to YYYY-MM-DD
  const formatDateISO = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Function to handle date preset button clicks
  const handleDatePreset = (preset: "7d" | "30d" | "90d") => {
    const today = new Date();
    // Use const as newStartDate is not reassigned anymore
    const newStartDate = new Date();

    if (preset === "7d") {
      newStartDate.setDate(today.getDate() - 7);
    } else if (preset === "30d") {
      newStartDate.setDate(today.getDate() - 30);
    } else if (preset === "90d") {
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
      const startFormatted = new Date(
        startDate + "T00:00:00"
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const endFormatted = new Date(endDate + "T00:00:00").toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short", day: "numeric" }
      );
      if (startDate === endDate) {
        return `${baseTitle} (${startFormatted})`;
      }
      return `${baseTitle} (${startFormatted} - ${endFormatted})`;
    } catch (e) {
      console.error("Error formatting date for title:", e);
      return `${baseTitle} (Custom Range)`; // Fallback
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 md:p-12 bg-gray-900 text-white">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">
        Game Sentiment Dashboard
      </h1>

      {/* Add Title for Controls Section */}
      <div className="w-full max-w-6xl mb-2 text-center">
        <h2 className="text-lg font-semibold text-gray-400">Filters</h2>
      </div>
      {/* Controls Section: Keyword Selector and Date Range */}
      <div className="w-full max-w-6xl mb-6 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 flex-wrap">
        <KeywordSelector
          keywords={keywordsList.data}
          selectedKeyword={selectedKeyword}
          onKeywordSelect={setSelectedKeyword}
          loading={keywordsList.loading}
        />
        {/* Display errors from keyword loading */}
        {keywordsList.error && (
          <p className="text-center text-red-500 py-2">
            Error loading keywords: {keywordsList.error}
          </p>
        )}

        {/* Date Range Picker & Presets Container */}
        <DateRangeControls
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          handleDatePreset={handleDatePreset}
        />
      </div>

      {/* Charts Section - Grid Layout */}
      <div className="w-full max-w-6xl mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart Container - Add fixed height */}
        <div className="lg:col-span-2 h-[374px]">
          {/* Line Chart display logic (using chartLoading, chartError, chartData) */}
          {chartState.loading && (
            <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
            </div>
          )}
          {chartState.error && !chartState.loading && (
            <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center text-center text-red-500">
              Error loading chart: {chartState.error}
            </div>
          )}
          {!chartState.loading &&
            !chartState.error &&
            selectedKeyword &&
            startDate &&
            endDate &&
            chartState.data.length > 0 && (
              <SentimentChart
                data={chartState.data}
                keyword={selectedKeyword}
                // Pass drilldown state
                drilldownSentiment={drilldownSentiment}
              />
            )}
          {/* Placeholder/Message when no chart data to show */}
          {(!selectedKeyword ||
            !startDate ||
            !endDate ||
            (!chartState.loading &&
              !chartState.error &&
              chartState.data.length === 0)) &&
            !chartState.loading && (
              <div className="bg-gray-800 shadow-lg rounded-lg p-6 text-center text-gray-500 h-full flex items-center justify-center">
                {
                  !selectedKeyword || !startDate || !endDate
                    ? "Select a keyword and a date range to view sentiment trend."
                    : `No timeseries data found for "${
                        selectedKeyword || ""
                      }" in the selected date range.` // Added null check for keyword
                }
              </div>
            )}
        </div>

        {/* Distribution Chart Container - Add fixed height */}
        <div className="lg:col-span-1 h-[374px]">
          {/* Distribution Chart display logic (using distributionLoading, distributionError, distributionData) */}
          {distributionState.loading && (
            <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
            </div>
          )}
          {distributionState.error && !distributionState.loading && (
            <div className="bg-gray-800 shadow-lg rounded-lg p-6 h-[374px] w-full flex items-center justify-center text-center text-red-500">
              Error loading distribution: {distributionState.error}
            </div>
          )}
          {!distributionState.loading &&
            !distributionState.error &&
            selectedKeyword &&
            startDate &&
            endDate &&
            distributionState.data.length > 0 && (
              <SentimentDistributionChart
                data={distributionState.data}
                keyword={selectedKeyword}
                periodAverages={selectedKeywordPeriodAverages}
                // Pass state and setter for drilldown
                selectedSentiment={drilldownSentiment}
                onSentimentSelect={setDrilldownSentiment}
              />
            )}
          {/* Placeholder/Message when no distribution data to show */}
          {(!selectedKeyword ||
            !startDate ||
            !endDate ||
            (!distributionState.loading &&
              !distributionState.error &&
              distributionState.data.length === 0)) &&
            !distributionState.loading && (
              <div className="bg-gray-800 shadow-lg rounded-lg p-6 text-center text-gray-500 h-full flex items-center justify-center">
                {!selectedKeyword || !startDate || !endDate
                  ? "Select keyword/dates."
                  : `No distribution data found.`}
              </div>
            )}
        </div>
      </div>

      {/* Grid layout for the two lists (Now Below Chart) */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <SentimentList
          // Use helper function for dynamic title
          title={getListTitle("Top 20 Most Negative Games")}
          data={negativeList.data}
          loading={negativeList.loading}
          error={negativeList.error}
          metric="avg_neg"
          colorClass="text-red-400"
          onKeywordClick={setSelectedKeyword}
        />
        <SentimentList
          // Use helper function for dynamic title
          title={getListTitle("Top 20 Most Positive Games")}
          data={positiveList.data}
          loading={positiveList.loading}
          error={positiveList.error}
          metric="avg_pos"
          colorClass="text-green-400"
          onKeywordClick={setSelectedKeyword}
        />
      </div>
    </main>
  );
}
