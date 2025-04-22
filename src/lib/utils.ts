import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDateISO = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const handleDatePreset = (
  preset: "7d" | "30d" | "90d",
  setStartDate: (date: string) => void,
  setEndDate: (date: string) => void
) => {
  const today = new Date();
  const newStartDate = new Date();
  if (preset === "7d") {
    newStartDate.setDate(today.getDate() - 7);
  } else if (preset === "30d") {
    newStartDate.setDate(today.getDate() - 30);
  } else if (preset === "90d") {
    newStartDate.setDate(today.getDate() - 90);
  }
  setStartDate(formatDateISO(newStartDate));
  setEndDate(formatDateISO(today));
};

export const getListTitle = (
  baseTitle: string,
  startDate: string,
  endDate: string
): string => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultStart = formatDateISO(thirtyDaysAgo);
  const today = formatDateISO(new Date());
  const isDefault = startDate === defaultStart && endDate === today;
  if (isDefault) {
    return `${baseTitle} (Last 30 Days)`;
  }
  try {
    const startFormatted = new Date(
      startDate + "T00:00:00"
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const endFormatted = new Date(endDate + "T00:00:00").toLocaleDateString(
      "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
    if (startDate === endDate) {
      return `${baseTitle} (${startFormatted})`;
    }
    return `${baseTitle} (${startFormatted} - ${endFormatted})`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return `${baseTitle} (Custom Range)`;
  }
};
