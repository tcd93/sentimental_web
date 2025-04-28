"use client"; // Add this directive for client-side fetching and state

import { useState, useEffect, useMemo } from "react";
import SentimentTimeSeriesChart from "@/components/SentimentTimeSeriesChart";
import { KeywordSelector } from "@/components/KeywordSelector";
import SentimentDistributionChart from "@/components/SentimentDistributionChart";
import SentimentList from "@/components/SentimentList";
import DateRangeControls from "@/components/DateRangeControls";
import { useDailySentimentData } from "@/lib/hooks/useDailySentimentData";
import { handleDatePreset, getListTitle } from "@/lib/utils";
// Import necessary types and placeholder calculation functions
// import { DailySentimentData } from "@/lib/types/sentiment"; // Removed unused import
import {
    calculateKeywordsList,
    calculateTimeSeriesData,
    calculateDistributionData,
    calculatePeriodAverages,
    calculatePositiveList,
    calculateNegativeList,
    calculateControversialList,
    // Add placeholder types for calculated data if not defined elsewhere
    type KeywordDataState,
    type ChartDataState,
    type DistributionDataState,
    type PeriodAveragesState,
    type SentimentListDataState,
    type ControversyListDataState
} from "../lib/dataProcessing"; // Adjusted import path
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import Link from "next/link";

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
  const [activeList, setActiveList] = useState<
    "positive" | "negative" | "controversial"
  >("controversial");

  // Fetch central daily data
  const dailyDataState = useDailySentimentData(startDate, endDate);

  // --- Memoized Data Processing --- 
  // Calculate derived data states from dailyDataState using useMemo

  const keywordsListState: KeywordDataState = useMemo(() => {
    return calculateKeywordsList(dailyDataState);
  }, [dailyDataState]);

  const chartState: ChartDataState = useMemo(() => {
    return calculateTimeSeriesData(dailyDataState, selectedKeyword);
  }, [dailyDataState, selectedKeyword]);

  const distributionState: DistributionDataState = useMemo(() => {
    return calculateDistributionData(dailyDataState, selectedKeyword);
  }, [dailyDataState, selectedKeyword]);

  const periodAveragesState: PeriodAveragesState = useMemo(() => {
    return calculatePeriodAverages(dailyDataState, selectedKeyword);
  }, [dailyDataState, selectedKeyword]);

  const positiveListState: SentimentListDataState = useMemo(() => {
    return calculatePositiveList(dailyDataState);
  }, [dailyDataState]);

  const negativeListState: SentimentListDataState = useMemo(() => {
    return calculateNegativeList(dailyDataState);
  }, [dailyDataState]);

  const controversialListState: ControversyListDataState = useMemo(() => {
    return calculateControversialList(dailyDataState);
  }, [dailyDataState]);

  // Effect to set default keyword (adjust logic based on new state structure)
  useEffect(() => {
    if (
      activeList === "controversial" &&
      !controversialListState.loading &&
      controversialListState.data.length > 0 &&
      !selectedKeyword && // Only set if no keyword is selected
      !keywordsListState.loading &&
      keywordsListState.data.length > 0 // Check if keywords are available
    ) {
      // Check if the top controversial keyword exists in the list of all keywords
      const topControversialKeyword = controversialListState.data[0].keyword;
      if (keywordsListState.data.includes(topControversialKeyword)) {
        setSelectedKeyword(topControversialKeyword);
      } else {
        // Fallback: select the first keyword from the general list if top controversial isn't found
        // This might happen if filtering removes the top controversial keyword
        if (keywordsListState.data.length > 0) {
          setSelectedKeyword(keywordsListState.data[0]);
          console.warn(`Top controversial game '${topControversialKeyword}' not found in available keywords list. Selecting first available keyword.`);
        } else {
          console.warn("No keywords available to select as default.");
        }
      }
    }
    // Reset keyword if it's no longer in the list (e.g., due to date change)
    else if (selectedKeyword && !keywordsListState.loading && !keywordsListState.data.includes(selectedKeyword)) {
      console.log(`Selected keyword '${selectedKeyword}' no longer in list. Resetting selection.`);
      setSelectedKeyword(null);
      // Optionally, set a new default here if desired
    }

  }, [activeList, controversialListState, keywordsListState, selectedKeyword]);

  return (
    <main className="w-full min-h-screen flex flex-col gap-y-6 items-center justify-start px-2 sm:px-4 md:px-6 lg:px-12 bg-gray-900 text-white">
      <Link
        href="/admin/login"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 absolute top-4 right-4 z-10"
        style={{ position: "absolute", top: 16, right: 16 }}
      >
        Admin Login
      </Link>
      <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">
        Game Sentiment Dashboard
      </h1>
      {/* Controls Section: Keyword Selector and Date Range */}
      <div className="w-full max-w-full md:max-w-screen-lg flex flex-col md:flex-row justify-center items-center gap-4 flex-wrap">
        <KeywordSelector
          keywordsState={keywordsListState}
          selectedKeyword={selectedKeyword}
          onKeywordSelect={setSelectedKeyword}
        />
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
        <div className="lg:col-span-2 bg-gray-800 rounded-xl mb-2 lg:mb-0 h-full">
          <SentimentTimeSeriesChart
            chartState={chartState}
            keyword={selectedKeyword || ''}
            drilldownSentiment={drilldownSentiment}
            chartHeight={280}
          />
        </div>

        {/* Distribution Chart Container */}
        <div className="lg:col-span-1 bg-gray-800 rounded-xl h-full">
          <SentimentDistributionChart
            distributionState={distributionState}
            keyword={selectedKeyword || ''}
            periodAverages={periodAveragesState.data?.[0] || null}
            selectedSentiment={drilldownSentiment}
            onSentimentSelect={setDrilldownSentiment}
            chartHeight={280}
          />
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
                : 0 // Default to controversial
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
            <div>
              <SentimentList
                title={getListTitle(
                  "Top 20 Controversies",
                  startDate,
                  endDate
                )}
                listState={controversialListState}
                metric="volatility"
                colorClass="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent"
                onKeywordClick={setSelectedKeyword}
                listHeight={360}
              />
            </div>
            <div>
              <SentimentList
                title={getListTitle(
                  "Top 20 Most Positive Games",
                  startDate,
                  endDate
                )}
                listState={positiveListState}
                metric="avg_pos"
                colorClass="text-green-400"
                onKeywordClick={setSelectedKeyword}
                listHeight={360}
              />
            </div>
            <div>
              <SentimentList
                title={getListTitle(
                  "Top 20 Most Negative Games",
                  startDate,
                  endDate
                )}
                listState={negativeListState}
                metric="avg_neg"
                colorClass="text-red-400"
                onKeywordClick={setSelectedKeyword}
                listHeight={360}
              />
            </div>
          </Carousel>
        </div>
      </div>
    </main>
  );
}
