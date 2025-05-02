"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
} from "react";
import { DailySentimentData } from "@/lib/types/DailySentimentData";
import { ListState } from "@/lib/types/ListState";

interface DailyDataContextProps {
  dailyDataState: ListState<DailySentimentData>;
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  selectedKeyword: string | null;
  setSelectedKeyword: (keyword: string | null) => void;
}

// Create the context with a default undefined value initially
const DailyDataContext = createContext<DailyDataContextProps | undefined>(
  undefined
);

interface DailyDataProviderProps {
  children: ReactNode;
  initialStartDate?: string;
  initialEndDate?: string;
}

// Calculate default dates only once
const defaultStartDate = (() => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
})();

const defaultEndDate = (() => {
  const date = new Date();
  return date.toISOString().split("T")[0];
})();

export const DailyDataProvider: React.FC<DailyDataProviderProps> = ({
  children,
  initialStartDate = defaultStartDate,
  initialEndDate = defaultEndDate,
}) => {
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const dailyDataState = useDailySentimentData(startDate, endDate);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      dailyDataState,
      startDate,
      endDate,
      setStartDate,
      setEndDate,
      selectedKeyword,
      setSelectedKeyword,
    }),
    [dailyDataState, startDate, endDate, selectedKeyword]
  );

  return (
    <DailyDataContext.Provider value={contextValue}>
      {children}
    </DailyDataContext.Provider>
  );
};

export const useDailyData = (): DailyDataContextProps => {
  const context = useContext(DailyDataContext);
  if (context === undefined) {
    throw new Error("useDailyData must be used within a DailyDataProvider");
  }
  return context;
};

const useDailySentimentData = (
  startDate: string,
  endDate: string
): ListState<DailySentimentData> => {
  const [state, setState] = useState<ListState<DailySentimentData>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      if (!startDate || !endDate) {
        console.warn("Skipping fetch: Start date or end date is missing.");
        // Use ListState type for prev
        setState((prev: ListState<DailySentimentData>) => ({
          ...prev,
          loading: false,
          data: [],
          error: null,
        }));
        return;
      }

      // Use ListState type for prev
      setState((prev: ListState<DailySentimentData>) => ({
        ...prev,
        loading: true,
        error: null,
      }));
      try {
        const params = new URLSearchParams({ startDate, endDate });
        const response = await fetch(
          `/api/sentiment/data?${params.toString()}`
        );

        if (!response.ok) {
          let errorToThrow: Error;
          const contentType = response.headers.get("content-type");

          if (contentType && contentType.includes("application/json")) {
            try {
              const errorData = await response.json();
              errorToThrow = new Error(
                errorData?.error ||
                  `API request failed with status ${response.status}`
              );
            } catch (jsonError) {
              console.error("Failed to parse JSON error response:", jsonError);
              errorToThrow = new Error(
                `API request failed with status ${response.status}, and the JSON error response could not be parsed.`
              );
            }
          } else {
            // Handle non-JSON responses (e.g., HTML error page from Vercel timeout)
            let errorText = `API request failed with status ${response.status}.`;
            try {
              const textResponse = await response.text();
              // Limit the length of the text included in the error message
              errorText += ` Server returned non-JSON response starting with: ${textResponse.substring(
                0,
                100
              )}...`;
              console.error("Received non-JSON error response:", textResponse);
            } catch (textError) {
              console.error(
                "Failed to read error response as text:",
                textError
              );
              errorText += " Could not read response body.";
            }
            errorToThrow = new Error(errorText);
          }
          throw errorToThrow;
        }

        // Assuming response.ok is true, proceed to parse the successful JSON response
        const result = await response.json();
        if (!Array.isArray(result.data)) {
          console.error("API returned non-array data:", result.data);
          throw new Error("Invalid data format received from API.");
        }

        // Ensure the data matches DailySentimentData[] if needed, though fetch returns any
        // Basic validation passed, assuming result.data is DailySentimentData[]
        setState({ data: result.data, loading: false, error: null });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error fetching daily sentiment data:", errorMessage);
        setState({ data: [], loading: false, error: errorMessage });
      }
    }

    fetchData();
  }, [startDate, endDate]);

  return state;
};
