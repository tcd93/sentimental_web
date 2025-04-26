import {
  AdminStatus,
  AdminStatusAction,
  ConfigData,
  KeywordItem,
  RedditKeywordItem,
  SteamKeywordItem,
} from "./types";
import { REDDIT_DEFAULTS, STEAM_DEFAULTS } from "./defaults";

export function getSubreddits(subreddits: string): string[] | undefined {
  const list = subreddits
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

// Generic cleaner: removes undefined, null, or empty (array/string) optional fields
function cleanObject<T extends KeywordItem>(
  obj: T,
  defaults: Partial<T>
): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (key === "isNew" || key === "isEdited" || key === "source") continue;
    const value = obj[key];
    const defaultValue = defaults[key];
    if (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "string" && value.trim() === "") ||
      value === defaultValue
    ) {
      continue;
    }
    cleaned[key] = value;
  }
  // Always keep keyword
  cleaned.keyword = obj.keyword;
  return cleaned;
}

export function cleanRedditItem(item: RedditKeywordItem) {
  return cleanObject(item, REDDIT_DEFAULTS);
}

export function cleanSteamItem(item: SteamKeywordItem) {
  return cleanObject(item, STEAM_DEFAULTS);
}

export function adminStatusReducer(
  state: AdminStatus,
  action: AdminStatusAction
): AdminStatus {
  switch (action.type) {
    case "LOADING":
      return { loading: true, saving: false, error: "", success: false };
    case "LOADED":
      return { ...state, loading: false };
    case "SAVING":
      return { ...state, saving: true, error: "", success: false };
    case "SAVED":
      return { ...state, saving: false, success: true };
    case "ERROR":
      return {
        ...state,
        loading: false,
        saving: false,
        error: action.error,
        success: false,
      };
    case "RESET":
      return { loading: false, saving: false, error: "", success: false };
    default:
      return state;
  }
}

// Helper function to clean config data for saving/display
export function getCleanedConfig(
  config: ConfigData
): Partial<ConfigData> {
  const cleanedOutput: Record<string, Partial<KeywordItem>[]> = {};

  Object.keys(config.source).forEach((sourceKey) => {
    const sourceItems = config.source[sourceKey as keyof typeof config.source];
    cleanedOutput[sourceKey] = sourceItems
      .map((item: KeywordItem) => {
        if (!item.keyword) return null;
        // Use class cleanForSave method
        return item.cleanForSave();
      })
      .filter((item): item is Partial<KeywordItem> => item !== null);

    if (cleanedOutput[sourceKey].length === 0) {
      delete cleanedOutput[sourceKey];
    }
  });

  return cleanedOutput;
}
