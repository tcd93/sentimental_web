export interface ListState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}
