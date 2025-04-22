// src/lib/reducers/listReducer.ts
export interface ListState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export type ListAction<T> =
  | { type: "loading" }
  | { type: "success"; data: T[] }
  | { type: "error"; error: string };

export function listReducer<T>(
  state: ListState<T>,
  action: ListAction<T>
): ListState<T> {
  switch (action.type) {
    case "loading":
      return { ...state, loading: true, error: null };
    case "success":
      return { data: action.data, loading: false, error: null };
    case "error":
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}
