// Centralized default values for Reddit and Steam sources

export const REDDIT_DEFAULTS = {
  time_filter: "day" as const,
  sort: "top" as const,
  post_limit: 6,
  top_comments_limit: 2,
};

export const STEAM_DEFAULTS = {
  time_filter: "day" as const,
  sort: "top" as const,
  post_limit: 8,
};
