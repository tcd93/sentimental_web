import { useReducer, useEffect, useCallback } from "react";
import { listReducer, ListAction } from "../reducers/listReducer";
import { SentimentSummary } from "../types/sentiment";
import { ApiResponse } from "@/app/api/response";

export function useSentimentLists(startDate: string, endDate: string) {
  const [negativeList, dispatchNegativeList] = useReducer(
    listReducer<SentimentSummary>,
    { data: [], loading: true, error: null }
  );
  const [positiveList, dispatchPositiveList] = useReducer(
    listReducer<SentimentSummary>,
    { data: [], loading: true, error: null }
  );

  const fetchData = useCallback(
    async (
      url: string,
      dispatch: React.Dispatch<ListAction<SentimentSummary>>,
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
    const negUrl = `/api/sentiment${listParams}&metric=avg_neg&order=desc`;
    const posUrl = `/api/sentiment${listParams}&metric=avg_pos&order=desc`;
    fetchData(negUrl, dispatchNegativeList);
    fetchData(posUrl, dispatchPositiveList);
  }, [fetchData, startDate, endDate]);

  return { negativeList, positiveList };
}
