// src/app/admin/types.ts

export interface BaseKeywordItem {
  keyword: string;
  isNew?: boolean;
  isEdited?: boolean;
}

export interface RedditKeywordItem extends BaseKeywordItem {
  source: "reddit";
  // without r/ prefix
  subreddits?: string[];
  top_comments_limit?: number;
  time_filter?: "all" | "year" | "month" | "week" | "day" | "hour";
  post_limit?: number;
  sort?: "relevance" | "hot" | "top" | "new" | "comments"; // Added sort
}

export interface SteamKeywordItem extends BaseKeywordItem {
  source: "steam";
  time_filter?: "all" | "year" | "month" | "week" | "day";
  sort?: "created" | "updated" | "top";
  post_limit?: number;
}

export type KeywordItem = RedditKeywordItem | SteamKeywordItem;

export function isRedditKeywordItem(item: KeywordItem | Partial<KeywordItem>): item is RedditKeywordItem {
  // Type guard needs to handle Partial for cleaning logic
  return item.source === "reddit";
}

export interface ConfigData {
  source: {
    [key: string]: KeywordItem[];
  };
} 