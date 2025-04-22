import { useReducer, useEffect, useCallback, useRef } from "react";
import { listReducer, ListAction } from "../reducers/listReducer";
import { SentimentSummary } from "../types/sentiment";
import { ApiResponse } from "@/app/api/response";

// Add type: "positive" | "negative" to only fetch one list at a time
export function useSentimentList(
  type: "positive" | "negative",
  startDate: string,
  endDate: string
) {
  const [list, dispatchList] = useReducer(listReducer<SentimentSummary>, {
    data: [],
    loading: true,
    error: null,
  });

  // In-memory cache for the lifetime of the component
  const cacheRef = useRef<{
    [key: string]: { data: SentimentSummary[]; error: string | null };
  }>({});

  const fetchData = useCallback(
    async (
      url: string,
      dispatch: React.Dispatch<ListAction<SentimentSummary>>,
      cacheKey: string
    ) => {
      dispatch({ type: "loading" });
      try {
        const response = await fetch(url);
        const result = (await response.json()) as ApiResponse<SentimentSummary>;
        if (result.error) throw new Error(result.details || result.error);
        cacheRef.current[cacheKey] = { data: result.data!, error: null };
        dispatch({ type: "success", data: result.data! });
      } catch (e) {
        const errorMsg =
          e instanceof Error ? e.message : "Failed to fetch data";
        cacheRef.current[cacheKey] = { data: [], error: errorMsg };
        dispatch({ type: "error", error: errorMsg });
      }
    },
    []
  );

  useEffect(() => {
    const cacheKey = `${type}_${startDate}_${endDate}`;
    const listParams = `?limit=20&startDate=${startDate}&endDate=${endDate}`;
    const url =
      type === "negative"
        ? `/api/sentiment${listParams}&metric=avg_neg&order=desc`
        : `/api/sentiment${listParams}&metric=avg_pos&order=desc`;
    // Check cache first
    const cached = cacheRef.current[cacheKey];
    if (cached) {
      if (cached.error) {
        dispatchList({ type: "error", error: cached.error });
      } else {
        dispatchList({ type: "success", data: cached.data });
      }
      return;
    }
    fetchData(url, dispatchList, cacheKey);
  }, [fetchData, startDate, endDate, type]);

  return list;
}
