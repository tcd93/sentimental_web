"use client"; // Add this directive for client-side fetching and state

import { useState, useEffect } from "react";
import SentimentTimeSeriesChart from "@/components/SentimentChart"; // Import the new chart component
import { KeywordSelector } from "@/components/KeywordSelector"; // Import the keyword selector
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"; // <-- Import Loader2 and Chevron icons
import SentimentDistributionChart from "@/components/SentimentDistributionChart"; // <-- Import the new chart
import SentimentList from "@/components/SentimentList";
import DateRangeControls from "@/components/DateRangeControls";
import { useSentimentList } from "@/lib/hooks/useSentimentLists";
import { useKeywords } from "@/lib/hooks/useKeywords";
import { useChartData } from "@/lib/hooks/useChartData";
import { handleDatePreset, getListTitle } from "@/lib/utils";
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

export default function Home() {
  // State for keywords
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  // State for Drilldown
  const [drilldownSentiment, setDrilldownSentiment] = useState<string | null>(
    null
  );
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
  const [activeList, setActiveList] = useState<"positive" | "negative">("positive");
  const TRANSITION_DURATION = 350; // ms, match carousel CSS
  const listState = useSentimentList(activeList, startDate, endDate);
  const { keywordsList } = useKeywords();
  const { chartState, distributionState, periodAveragesState } = useChartData(
    selectedKeyword,
    startDate,
    endDate
  );

  // Effect to set default keyword AFTER positive list loads (if none selected yet)
  useEffect(() => {
    if (
      activeList === "positive" &&
      !listState.loading &&
      listState.data.length > 0 &&
      !selectedKeyword &&
      !keywordsList.loading
    ) {
      if (keywordsList.data.includes(listState.data[0].keyword)) {
        setSelectedKeyword(listState.data[0].keyword);
      } else {
        console.warn("Top positive game not found in distinct keywords list.");
      }
    }
  }, [activeList, listState, selectedKeyword, keywordsList]);

  return (
    <main className="flex flex-col items-center justify-start p-6 md:p-12 bg-gray-900 text-white">
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
          handleDatePreset={(preset) =>
            handleDatePreset(preset, setStartDate, setEndDate)
          }
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
              <SentimentTimeSeriesChart
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
            distributionState.data.length > 0 &&
            periodAveragesState.data.length > 0 && (
              <SentimentDistributionChart
                data={distributionState.data}
                keyword={selectedKeyword}
                periodAverages={periodAveragesState.data[0]}
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
      <div className="w-full max-w-6xl flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 mb-2 select-none">
          <button
            aria-label="Show Negative List"
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
            onClick={() => setActiveList("negative")}
            disabled={activeList === "negative"}
          >
            <ChevronLeft className="w-6 h-6 text-red-400" />
          </button>
          <span className="text-lg font-semibold min-w-[120px] text-center">
            {activeList === "positive" ? "Most Positive" : "Most Negative"}
          </span>
          <button
            aria-label="Show Positive List"
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
            onClick={() => setActiveList("positive")}
            disabled={activeList === "positive"}
          >
            <ChevronRight className="w-6 h-6 text-green-400" />
          </button>
        </div>
        <div className="w-full h-[420px]">
          <Carousel
            selectedItem={activeList === "positive" ? 0 : 1}
            onChange={idx => setActiveList(idx === 0 ? "positive" : "negative")}
            showThumbs={false}
            showStatus={false}
            showArrows={false}
            showIndicators={true}
            swipeable={true}
            emulateTouch={true}
            infiniteLoop={false}
            transitionTime={TRANSITION_DURATION}
            className="h-full"
          >
            <div className="h-[420px]">
              <SentimentList
                title={getListTitle("Top 20 Most Positive Games", startDate, endDate)}
                data={listState.data}
                loading={listState.loading}
                error={listState.error}
                metric="avg_pos"
                colorClass="text-green-400"
                onKeywordClick={setSelectedKeyword}
              />
            </div>
            <div className="h-[420px]">
              <SentimentList
                title={getListTitle("Top 20 Most Negative Games", startDate, endDate)}
                data={listState.data}
                loading={listState.loading}
                error={listState.error}
                metric="avg_neg"
                colorClass="text-red-400"
                onKeywordClick={setSelectedKeyword}
              />
            </div>
          </Carousel>
        </div>
      </div>
    </main>
  );
}
