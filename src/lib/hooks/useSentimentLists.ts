import { useReducer, useEffect, useCallback, useRef } from "react";
import { listReducer, ListAction } from "../reducers/listReducer";
import { SentimentSummary } from "../types/sentiment";
import { ApiResponse } from "@/app/api/response";

// type: "positive" | "negative" | "gainers" | "losers"
export function useSentimentList(
  type: "positive" | "negative" | "gainers" | "losers",
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
    let url = "";
    if (type === "positive" || type === "negative") {
      const metric = type === "positive" ? "avg_pos" : "avg_neg";
      url = `/api/sentiment?limit=20&startDate=${startDate}&endDate=${endDate}&metric=${metric}&order=desc`;
    } else if (type === "gainers" || type === "losers") {
      url = `/api/sentiment/delta?limit=20&startDate=${startDate}&endDate=${endDate}&deltaType=${type}`;
    }
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
