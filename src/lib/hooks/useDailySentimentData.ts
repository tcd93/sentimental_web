import { useState, useEffect } from "react";
import { DailySentimentData } from "@/lib/types/sentiment";
import { ListState } from "@/lib/reducers/listReducer"; // Import existing ListState

// Remove the local API_STATE definition
/*
export interface API_STATE<T> {
    data: T;
    loading: boolean;
    error: string | null;
}
*/

// Use ListState for the hook's return type and internal state
export function useDailySentimentData(
  startDate: string,
  endDate: string
): ListState<DailySentimentData> {
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
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `API request failed with status ${response.status}`
          );
        }

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
}
