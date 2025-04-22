import { useReducer, useEffect, useCallback } from "react";
import { listReducer } from "../reducers/listReducer";
import { ApiResponse } from "@/app/api/response";

export function useKeywords() {
  const [keywordsList, dispatchKeywordsList] = useReducer(
    listReducer<string>,
    { data: [], loading: true, error: null }
  );

  const fetchKeywords = useCallback(async () => {
    dispatchKeywordsList({ type: "loading" });
    try {
      const response = await fetch("/api/keywords");
      const result = (await response.json()) as ApiResponse<string>;
      if (result.error) throw new Error(result.details || result.error);
      dispatchKeywordsList({ type: "success", data: result.data! });
    } catch (e) {
      dispatchKeywordsList({
        type: "error",
        error: e instanceof Error ? e.message : "Failed to fetch keywords",
      });
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return { keywordsList };
}
