import { useReducer, useEffect, useCallback } from "react";
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

  const fetchData = useCallback(
    async (
      url: string,
      dispatch: React.Dispatch<ListAction<SentimentSummary>>
    ) => {
      dispatch({ type: "loading" });
      try {
        const response = await fetch(url);
        const result = (await response.json()) as ApiResponse<SentimentSummary>;
        if (result.error) throw new Error(result.details || result.error);
        dispatch({ type: "success", data: result.data! });
      } catch (e) {
        dispatch({
          type: "error",
          error: e instanceof Error ? e.message : "Failed to fetch data",
        });
      }
    },
    []
  );

  useEffect(() => {
    const listParams = `?limit=20&startDate=${startDate}&endDate=${endDate}`;
    const url =
      type === "negative"
        ? `/api/sentiment${listParams}&metric=avg_neg&order=desc`
        : `/api/sentiment${listParams}&metric=avg_pos&order=desc`;
    fetchData(url, dispatchList);
  }, [fetchData, startDate, endDate, type]);

  return list;
}
