import { useReducer, useEffect, useCallback } from "react";
import { listReducer } from "../reducers/listReducer";
import { SentimentDelta } from "../types/sentiment";
import { ApiResponse } from "@/app/api/response";

export function useSentimentDeltaList(
  startDate: string,
  endDate: string
) {
  const [list, dispatchList] = useReducer(listReducer<SentimentDelta>, {
    data: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    dispatchList({ type: "loading" });
    try {
      const url = `/api/sentiment/delta?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);
      const result = (await response.json()) as ApiResponse<SentimentDelta>;
      if (result.error) throw new Error(result.details || result.error);
      dispatchList({ type: "success", data: result.data! });
    } catch (e) {
      dispatchList({
        type: "error",
        error: e instanceof Error ? e.message : "Failed to fetch data",
      });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return list;
}
