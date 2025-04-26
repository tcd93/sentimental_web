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

  private _original: Partial<RedditKeywordItem>;

  constructor(
    data: Partial<RedditKeywordItem>,
    original?: Partial<RedditKeywordItem>
  ) {
    this.keyword = data.keyword || "";
    this.subreddits = data.subreddits;
    this.top_comments_limit = data.top_comments_limit;
    this.time_filter = data.time_filter;
    this.post_limit = data.post_limit;
    this.sort = data.sort;
    this._original = original ? { ...original } : { ...data };
  }

  isNew(): boolean {
    // If no original, it's new
    return !this._original || !this._original.keyword;
  }

  isEdited(): boolean {
    // Compare current state to original
    return (
      JSON.stringify(this.cleanForSave()) !==
      JSON.stringify(new RedditKeywordItem(this._original).cleanForSave())
    );
  }

  cleanForSave(): Partial<RedditKeywordItem> {
    // Remove undefined, null, or empty/blank fields
    const cleaned: Partial<RedditKeywordItem> = { keyword: this.keyword };
    if (this.subreddits && this.subreddits.length > 0)
      cleaned.subreddits = this.subreddits;
    if (this.top_comments_limit !== undefined)
      cleaned.top_comments_limit = this.top_comments_limit;
    if (this.time_filter !== undefined) cleaned.time_filter = this.time_filter;
    if (this.post_limit !== undefined) cleaned.post_limit = this.post_limit;
    if (this.sort !== undefined) cleaned.sort = this.sort;
    return cleaned;
  }
}

// Class-based model for SteamKeywordItem
export class SteamKeywordItem {
  public source = "steam" as const;
  public keyword: string;
  public time_filter?: SteamTimeFilter;
  public sort?: SteamSort;
  public post_limit?: number;

  private _original: Partial<SteamKeywordItem>;

  constructor(
    data: Partial<SteamKeywordItem>,
    original?: Partial<SteamKeywordItem>
  ) {
    this.keyword = data.keyword || "";
    this.time_filter = data.time_filter;
    this.sort = data.sort;
    this.post_limit = data.post_limit;
    this._original = original ? { ...original } : { ...data };
  }

  isNew(): boolean {
    return !this._original || !this._original.keyword;
  }

  isEdited(): boolean {
    return (
      JSON.stringify(this.cleanForSave()) !==
      JSON.stringify(new SteamKeywordItem(this._original).cleanForSave())
    );
  }

  cleanForSave(): Partial<SteamKeywordItem> {
    const cleaned: Partial<SteamKeywordItem> = { keyword: this.keyword };
    if (this.time_filter !== undefined) cleaned.time_filter = this.time_filter;
    if (this.sort !== undefined) cleaned.sort = this.sort;
    if (this.post_limit !== undefined) cleaned.post_limit = this.post_limit;
    return cleaned;
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
  | { open: true; index: number | null; isNew: boolean };

// Use Record for config source
export interface ConfigData {
  source: Record<string, KeywordItem[]>;
}
