import { useReducer, useEffect } from "react";
import { listReducer } from "../reducers/listReducer";
import { TimeseriesDataPoint, DistributionDataPoint, SentimentSummary } from "../types/sentiment";
import { ApiResponse } from "@/app/api/response";

export function useChartData(selectedKeyword: string | null, startDate: string, endDate: string) {
  const [chartState, dispatchChartState] = useReducer(
    listReducer<TimeseriesDataPoint>,
    { data: [], loading: false, error: null }
  );
  const [distributionState, dispatchDistributionState] = useReducer(
    listReducer<DistributionDataPoint>,
    { data: [], loading: false, error: null }
  );
  const [periodAveragesState, setPeriodAveragesState] = useReducer(
    listReducer<SentimentSummary>,
    { data: [], loading: false, error: null }
  );

  useEffect(() => {
    dispatchChartState({ type: "success", data: [] });
    dispatchDistributionState({ type: "success", data: [] });
    setPeriodAveragesState({ type: "success", data: [] });
    if (selectedKeyword && startDate && endDate) {
      const baseParams = `keyword=${encodeURIComponent(selectedKeyword)}&startDate=${startDate}&endDate=${endDate}`;
      const timeseriesUrl = `/api/sentiment/timeseries?${baseParams}`;
      const distributionUrl = `/api/sentiment/distribution?${baseParams}`;
      const periodAveragesUrl = `/api/sentiment?${baseParams}&limit=1`;
      // Timeseries
      (async () => {
        dispatchChartState({ type: "loading" });
        try {
          const response = await fetch(timeseriesUrl);
          const result = (await response.json()) as ApiResponse<TimeseriesDataPoint>;
          if (result.error) throw new Error(result.details || result.error);
          dispatchChartState({ type: "success", data: result.data! });
        } catch (e) {
          dispatchChartState({ type: "error", error: e instanceof Error ? e.message : "Failed to fetch chart data" });
        }
      })();
      // Distribution
      (async () => {
        dispatchDistributionState({ type: "loading" });
        try {
          const response = await fetch(distributionUrl);
          const result = (await response.json()) as ApiResponse<DistributionDataPoint>;
          if (result.error) throw new Error(result.details || result.error);
          dispatchDistributionState({ type: "success", data: result.data! });
        } catch (e) {
          dispatchDistributionState({ type: "error", error: e instanceof Error ? e.message : "Failed to fetch distribution data" });
        }
      })();
      // Period averages
      (async () => {
        setPeriodAveragesState({ type: "loading" });
        try {
          const response = await fetch(periodAveragesUrl);
          const result = (await response.json()) as ApiResponse<SentimentSummary>;
          if (result.error) throw new Error(result.details || result.error);
          setPeriodAveragesState({ type: "success", data: result.data! });
        } catch (e) {
          setPeriodAveragesState({ type: "error", error: e instanceof Error ? e.message : "Failed to fetch period averages" });
        }
      })();
    } else {
      const errorMsg = selectedKeyword && (!startDate || !endDate) ? "Please select both a start and end date." : null;
      if (errorMsg) {
        dispatchChartState({ type: "error", error: errorMsg });
        dispatchDistributionState({ type: "error", error: errorMsg });
      }
    }
  }, [selectedKeyword, startDate, endDate]);

  return { chartState, distributionState, periodAveragesState };
}
