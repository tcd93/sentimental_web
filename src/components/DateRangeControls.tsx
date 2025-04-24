import React from "react";

interface DateRangeControlsProps {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  handleDatePreset: (preset: "7d" | "30d" | "90d") => void;
}

const DateRangeControls: React.FC<DateRangeControlsProps> = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  handleDatePreset,
}) => (
  <div className="w-full sm:w-auto max-w-xs sm:max-w-none flex flex-col sm:flex-row gap-2 items-center justify-center">
    <div className="flex w-full sm:w-auto gap-2">
      <label className="text-sm text-gray-300 flex-shrink-0" htmlFor="start-date">From:</label>
      <input
        id="start-date"
        type="date"
        className="w-full sm:w-auto min-w-0 rounded bg-gray-700 text-white px-2 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
    </div>
    <div className="flex w-full sm:w-auto gap-2">
      <label className="text-sm text-gray-300 flex-shrink-0" htmlFor="end-date">To:</label>
      <input
        id="end-date"
        type="date"
        className="w-full sm:w-auto min-w-0 rounded bg-gray-700 text-white px-2 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
    </div>
    <div className="flex w-full sm:w-auto gap-2 justify-center">
      <button
        type="button"
        className="flex-1 sm:flex-initial rounded bg-gray-700 text-gray-200 px-2 py-1 text-xs border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => handleDatePreset('7d')}
      >
        7D
      </button>
      <button
        type="button"
        className="flex-1 sm:flex-initial rounded bg-gray-700 text-gray-200 px-2 py-1 text-xs border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => handleDatePreset('30d')}
      >
        30D
      </button>
      <button
        type="button"
        className="flex-1 sm:flex-initial rounded bg-gray-700 text-gray-200 px-2 py-1 text-xs border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => handleDatePreset('90d')}
      >
        90D
      </button>
    </div>
  </div>
);

export default DateRangeControls;
