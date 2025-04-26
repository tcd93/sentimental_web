// src/app/admin/types.ts
import { z } from "zod";

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

// Zod enums for reuse
export const RedditSortEnum = z.enum(["relevance", "hot", "top", "new", "comments"]);
export const RedditTimeFilterEnum = z.enum(["all", "year", "month", "week", "day", "hour"]);
export const SteamSortEnum = z.enum(["created", "updated", "top"]);
export const SteamTimeFilterEnum = z.enum(["all", "year", "month", "week", "day"]);

export const RedditKeywordItemSchema = z.object({
  keyword: z.string(),
  subreddits: z.array(z.string()).optional(),
  top_comments_limit: z.number().optional(),
  time_filter: RedditTimeFilterEnum.optional(),
  post_limit: z.number().optional(),
  sort: RedditSortEnum.optional(),
});

export const SteamKeywordItemSchema = z.object({
  keyword: z.string(),
  time_filter: SteamTimeFilterEnum.optional(),
  sort: SteamSortEnum.optional(),
  post_limit: z.number().optional(),
});

export type RedditKeywordItem = z.infer<typeof RedditKeywordItemSchema>;
export type SteamKeywordItem = z.infer<typeof SteamKeywordItemSchema>;

export type KeywordItem = RedditKeywordItem | SteamKeywordItem;

// Use Record for config source
export const ConfigDataSchema = z.object({
  source: z.object({
    reddit: z.array(RedditKeywordItemSchema),
    steam: z.array(SteamKeywordItemSchema),
  }),
});

export type ConfigData = z.infer<typeof ConfigDataSchema>;
