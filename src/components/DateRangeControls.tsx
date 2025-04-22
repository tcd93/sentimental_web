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
  <div className="flex items-center gap-4 flex-wrap justify-center">
    {/* Custom Date Inputs */}
    <div className="flex items-center gap-2">
      <label htmlFor="startDate" className="text-sm text-gray-400">
        From:
      </label>
      <input
        type="date"
        id="startDate"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
      />
      <label htmlFor="endDate" className="text-sm text-gray-400">
        To:
      </label>
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
      {(["7d", "30d", "90d"] as const).map((preset) => (
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
);

export default DateRangeControls;
