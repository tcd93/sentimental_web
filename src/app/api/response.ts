import { NextResponse } from "next/server";

export type ApiResponse<T> = {
  data: T[] | null;
  error: string | null;
  details: string | null;
};

export function jsonResponse<T>(
  { data = null, error = null, details = null }: Partial<ApiResponse<T>>,
  status = 200
) {
  return NextResponse.json({ data, error, details }, { status });
}
