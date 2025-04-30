"use client";

import { DailyDataProvider } from "@/contexts/DailyDataProvider";
import DateRangeControls from "@/components/DateRangeControls";
import { KeywordSelector } from "@/components/KeywordSelector";
import SentimentDistributionChart from "@/components/SentimentDistributionChart";
import SentimentList from "@/components/SentimentList";
import SentimentTimeSeriesChart from "@/components/SentimentTimeSeriesChart";
import Link from "next/link";
import { useState } from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

function DashboardContent() {
  const [drilldownSentiment, setDrilldownSentiment] = useState<string | null>(
    null
  );
  const [activeList, setActiveList] = useState<
    "positive" | "negative" | "controversial"
  >("controversial");

  return (
    <>
      {/* Controls Section: Remove props from KeywordSelector */}
      <div className="w-full max-w-full md:max-w-screen-lg flex flex-col md:flex-row justify-center items-center gap-4 flex-wrap">
        <KeywordSelector/>
        <DateRangeControls />
      </div>

      {/* Charts Section: Remove keyword prop */}
      <div className="w-full max-w-full md:max-w-screen-lg flex flex-col gap-4 lg:grid lg:grid-cols-3 h-auto">
        <div className="lg:col-span-2 bg-gray-800 rounded-xl mb-2 lg:mb-0 h-full">
          <SentimentTimeSeriesChart
            drilldownSentiment={drilldownSentiment}
            chartHeight={280}
          />
        </div>
        <div className="lg:col-span-1 bg-gray-800 rounded-xl h-full">
          <SentimentDistributionChart
            drilldownSentiment={drilldownSentiment}
            onSentimentSelect={setDrilldownSentiment}
            chartHeight={280}
          />
        </div>
      </div>

      {/* Lists Section: Remove onKeywordClick prop */}
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
                : 0
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
            preventMovementUntilSwipeScrollTolerance={true}
            swipeScrollTolerance={50}
          >
            <div>
              <SentimentList
                metric="volatility"
                colorClass="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent"
                listHeight={360}
              />
            </div>
            <div>
              <SentimentList
                metric="avg_pos"
                colorClass="text-green-400"
                listHeight={360}
              />
            </div>
            <div>
              <SentimentList
                metric="avg_neg"
                colorClass="text-red-400"
                listHeight={360}
              />
            </div>
          </Carousel>
        </div>
      </div>
    </>
  );
}

export default function Home() {
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
      {/* Wrap the content that needs context with the provider */}
      <DailyDataProvider>
        <DashboardContent />
      </DailyDataProvider>
    </main>
  );
}
