"use client"; // Add this directive for client-side fetching and state

import { useState, useEffect } from "react";
import SentimentChart from "@/components/SentimentChart"; // Import the new chart component
import { KeywordSelector } from "@/components/KeywordSelector"; // Import the keyword selector
import { Loader2 } from "lucide-react"; // <-- Import Loader2 icon
import SentimentDistributionChart from "@/components/SentimentDistributionChart"; // <-- Import the new chart
import SentimentList from "@/components/SentimentList";
import DateRangeControls from "@/components/DateRangeControls";
import { SentimentSummary } from "@/lib/types/sentiment";
import { useSentimentLists } from "@/lib/hooks/useSentimentLists";
import { useKeywords } from "@/lib/hooks/useKeywords";
import { useChartData } from "@/lib/hooks/useChartData";

export default function Home() {
  // State for keywords
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  // State for Drilldown
  const [drilldownSentiment, setDrilldownSentiment] = useState<string | null>(null);
  // State for Date Range
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });

  // Use custom hooks for data fetching and state
  const { negativeList, positiveList } = useSentimentLists(startDate, endDate);
  const { keywordsList } = useKeywords();
  const { chartState, distributionState, periodAveragesApiResult } = useChartData(selectedKeyword, startDate, endDate);

  // State for Overall Period Averages (single object or null)
  const [selectedKeywordPeriodAverages, setSelectedKeywordPeriodAverages] = useState<SentimentSummary | null>(null);

  // Update single period average object when the API array result changes
  useEffect(() => {
    if (periodAveragesApiResult && periodAveragesApiResult.data.length > 0) {
      setSelectedKeywordPeriodAverages(periodAveragesApiResult.data[0]);
    } else {
      setSelectedKeywordPeriodAverages(null);
    }
  }, [periodAveragesApiResult]);

  // Effect to set default keyword AFTER positive list loads (if none selected yet)
  useEffect(() => {
    if (
      !positiveList.loading &&
      positiveList.data.length > 0 &&
      !selectedKeyword &&
      !keywordsList.loading
    ) {
      if (keywordsList.data.includes(positiveList.data[0].keyword)) {
        setSelectedKeyword(positiveList.data[0].keyword);
      } else {
        console.warn("Top positive game not found in distinct keywords list.");
      }
    }
  }, [positiveList, selectedKeyword, keywordsList]);

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
