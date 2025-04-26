// src/app/admin/types.ts

// Enums for sort and time_filter fields
export type RedditSort = "relevance" | "hot" | "top" | "new" | "comments";
export type RedditTimeFilter =
  | "all"
  | "year"
  | "month"
  | "week"
  | "day"
  | "hour";
export type SteamSort = "created" | "updated" | "top";
export type SteamTimeFilter = "all" | "year" | "month" | "week" | "day";

// Class-based model for RedditKeywordItem
export class RedditKeywordItem {
  public source = "reddit" as const;
  public keyword: string;
  public subreddits?: string[];
  public top_comments_limit?: number;
  public time_filter?: RedditTimeFilter;
  public post_limit?: number;
  public sort?: RedditSort;

  constructor(data: Partial<RedditKeywordItem>) {
    this.keyword = data.keyword || "";
    this.subreddits = data.subreddits;
    this.top_comments_limit = data.top_comments_limit;
    this.time_filter = data.time_filter;
    this.post_limit = data.post_limit;
    this.sort = data.sort;
  }
}

// Class-based model for SteamKeywordItem
export class SteamKeywordItem {
  public source = "steam" as const;
  public keyword: string;
  public time_filter?: SteamTimeFilter;
  public sort?: SteamSort;
  public post_limit?: number;

  constructor(data: Partial<SteamKeywordItem>) {
    this.keyword = data.keyword || "";
    this.time_filter = data.time_filter;
    this.sort = data.sort;
    this.post_limit = data.post_limit;
  }
}

// Discriminated union for keyword items (now classes)
export type KeywordItem = RedditKeywordItem | SteamKeywordItem;

export function isRedditKeywordItem(
  item: KeywordItem | Partial<KeywordItem>
): item is RedditKeywordItem {
  return item.source === "reddit";
}

// --- Admin status reducer and types ---
export type AdminStatus = {
  loading: boolean;
  saving: boolean;
  error: string;
  success: boolean;
};

export type AdminStatusAction =
  | { type: "LOADING" }
  | { type: "LOADED" }
  | { type: "SAVING" }
  | { type: "SAVED" }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

export type ModalState =
  | { open: false }
  | { open: true; index: number | null; item: KeywordItem | null };

// Use Record for config source
export class ConfigData {
  source: {
    reddit: RedditKeywordItem[];
    steam: SteamKeywordItem[];
  };

  constructor(config: Partial<ConfigData>) {
    this.source = {
      reddit: config.source?.reddit || [],
      steam: config.source?.steam || [],
    };
  }
}
