"use client"; // Add this directive for client-side fetching and state

import { useState, useEffect } from "react";
import SentimentTimeSeriesChart from "@/components/SentimentTimeSeriesChart";
import { KeywordSelector } from "@/components/KeywordSelector";
import { Loader2 } from "lucide-react";
import SentimentDistributionChart from "@/components/SentimentDistributionChart";
import SentimentList from "@/components/SentimentList";
import DateRangeControls from "@/components/DateRangeControls";
import { useSentimentScoreData } from "@/lib/hooks/useSentimentScoreData";
import { useKeywordData } from "@/lib/hooks/useKeywordData";
import { useChartData } from "@/lib/hooks/useChartData";
import { handleDatePreset, getListTitle } from "@/lib/utils";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { useSentimentControversyData } from "@/lib/hooks/useSentimentControversyData";

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
  const [activeList, setActiveList] = useState<
    "positive" | "negative" | "controversial"
  >("controversial");
  const positiveListState = useSentimentScoreData("positive", startDate, endDate);
  const negativeListState = useSentimentScoreData("negative", startDate, endDate);
  const controversialListState = useSentimentControversyData(startDate, endDate);

  const { keywordsList } = useKeywordData();
  const { chartState, distributionState, periodAveragesState } = useChartData(
    selectedKeyword,
    startDate,
    endDate
  );

  // Effect to set default keyword AFTER positive list loads (if none selected yet)
  useEffect(() => {
    if (
      activeList === "controversial" &&
      !controversialListState.loading &&
      controversialListState.data.length > 0 &&
      !selectedKeyword &&
      !keywordsList.loading
    ) {
      if (keywordsList.data.includes(controversialListState.data[0].keyword)) {
        setSelectedKeyword(controversialListState.data[0].keyword);
      } else {
        console.warn("Top controversial game not found in distinct keywords list.");
      }
    }
  }, [activeList, controversialListState, selectedKeyword, keywordsList]);

  return (
    <main className="w-full min-h-screen flex flex-col gap-y-6 items-center justify-start px-2 sm:px-4 md:px-6 lg:px-12 bg-gray-900 text-white">
      <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">
        Game Sentiment Dashboard
      </h1>
      {/* Controls Section: Keyword Selector and Date Range */}
      <div className="w-full max-w-full md:max-w-screen-lg flex flex-col md:flex-row justify-center items-center gap-4 flex-wrap">
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
      <div className="w-full max-w-full md:max-w-screen-lg flex flex-col gap-4 lg:grid lg:grid-cols-3 h-auto">
        {/* Line Chart Container */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl mb-2 lg:mb-0">
          {/* Line Chart display logic (using chartLoading, chartError, chartData) */}
          {chartState.loading && (
            <div className="flex items-center justify-center min-h-[180px]">
              <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
            </div>
          )}
          {chartState.error && !chartState.loading && (
            <div className="flex items-center justify-center text-center text-red-500">
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
                drilldownSentiment={drilldownSentiment}
              />
            )}
          {(!selectedKeyword ||
            !startDate ||
            !endDate ||
            (!chartState.loading &&
              !chartState.error &&
              chartState.data.length === 0)) &&
            !chartState.loading && (
              <div className="text-center text-gray-500 flex items-center justify-center min-h-[120px]">
                {
                  !selectedKeyword || !startDate || !endDate
                    ? "Select a keyword and a date range to view sentiment trend."
                    : `No timeseries data found for "${
                        selectedKeyword || ""
                      }" in the selected date range.`
                }
              </div>
            )}
        </div>

        {/* Distribution Chart Container */}
        <div className="lg:col-span-1 bg-gray-800 rounded-xl">
          {/* Distribution Chart display logic (using distributionLoading, distributionError, distributionData) */}
          {distributionState.loading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
            </div>
          )}
          {distributionState.error && !distributionState.loading && (
            <div className="flex items-center justify-center text-center text-red-500">
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
              <div className="text-center text-gray-500 h-full flex items-center justify-center">
                {!selectedKeyword || !startDate || !endDate
                  ? "Select keyword/dates."
                  : `No distribution data found.`}
              </div>
            )}
        </div>
      </div>

      {/* Lists Section */}
      <div className="w-full max-w-full md:max-w-screen-lg flex flex-col items-center gap-4">
        <div className="w-full bg-gray-800 rounded-xl">
          <Carousel
            selectedItem={
              activeList === "controversial"
                ? 0
                : activeList === "positive"
                ? 1
                : activeList === "negative"
                ? 2
                : 3
            }
            onChange={(idx) =>
              setActiveList(
                idx === 0
                  ? "controversial"
                  : idx === 1
                  ? "positive"
                  : idx === 2
                  ? "negative"
                  : "controversial"
              )
            }
            showThumbs={false}
            showStatus={false}
            showArrows={false}
            showIndicators={true}
            swipeable={true}
            emulateTouch={true}
            infiniteLoop={false}
            transitionTime={400}
            className="h-full w-full"
            // must add these two lines to enable mobile scrolling
            preventMovementUntilSwipeScrollTolerance={true}
            swipeScrollTolerance={50}
          >
            <div className="h-[360px] w-full">
              <SentimentList
                title={getListTitle(
                  "Top 20 Controversies",
                  startDate,
                  endDate
                )}
                data={controversialListState.data}
                loading={controversialListState.loading}
                error={controversialListState.error}
                metric="volatility"
                // oil-slick gradient color
                colorClass="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent"
                onKeywordClick={setSelectedKeyword}
              />
            </div>
            <div className="h-[360px] w-full">
              <SentimentList
                title={getListTitle(
                  "Top 20 Most Positive Games",
                  startDate,
                  endDate
                )}
                data={positiveListState.data}
                loading={positiveListState.loading}
                error={positiveListState.error}
                metric="avg_pos"
                colorClass="text-green-400"
                onKeywordClick={setSelectedKeyword}
              />
            </div>
            <div className="h-[360px] w-full">
              <SentimentList
                title={getListTitle(
                  "Top 20 Most Negative Games",
                  startDate,
                  endDate
                )}
                data={negativeListState.data}
                loading={negativeListState.loading}
                error={negativeListState.error}
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
