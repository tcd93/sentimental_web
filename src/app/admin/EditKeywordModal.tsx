// src/app/admin/EditKeywordModal.tsx
import { useState, useEffect } from "react";
import {
  KeywordItem,
  RedditKeywordItem,
  SteamKeywordItem,
  isRedditKeywordItem,
  RedditTimeFilter,
  RedditSort,
  SteamTimeFilter,
  SteamSort,
} from "./types";
import { REDDIT_DEFAULTS, STEAM_DEFAULTS } from "./defaults";
import { parseOptionalInt, getSubreddits } from "./utils";

interface EditKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: KeywordItem | null; // Accepts class instance
  source: string; // 'reddit' or 'steam'
  onSave: (item: KeywordItem) => void;
}

export default function EditKeywordModal({
  isOpen,
  onClose,
  item,
  source,
  onSave,
}: EditKeywordModalProps) {
  // --- State for form fields ---
  const [form, setForm] = useState<{
    keyword: string;
    subreddits: string;
    redditTimeFilter: RedditTimeFilter;
    redditSort: RedditSort;
    redditPostLimit: string | number;
    redditTopCommentsLimit: string | number;
    steamTimeFilter: SteamTimeFilter;
    steamSort: SteamSort;
    steamPostLimit: string | number;
  }>({
    keyword: "",
    subreddits: "",
    redditTimeFilter: REDDIT_DEFAULTS.time_filter,
    redditSort: REDDIT_DEFAULTS.sort,
    redditPostLimit: "",
    redditTopCommentsLimit: "",
    steamTimeFilter: STEAM_DEFAULTS.time_filter,
    steamSort: STEAM_DEFAULTS.sort,
    steamPostLimit: "",
  });

  useEffect(() => {
    if (item) {
      setForm((prev) => ({
        ...prev,
        keyword: item.keyword || "",
        subreddits: isRedditKeywordItem(item) ? (item.subreddits ?? []).join(", ") : "",
        redditTimeFilter: isRedditKeywordItem(item) ? item.time_filter || REDDIT_DEFAULTS.time_filter : REDDIT_DEFAULTS.time_filter,
        redditSort: isRedditKeywordItem(item) ? item.sort || REDDIT_DEFAULTS.sort : REDDIT_DEFAULTS.sort,
        redditPostLimit: isRedditKeywordItem(item) && item.post_limit !== undefined ? item.post_limit : "",
        redditTopCommentsLimit: isRedditKeywordItem(item) && item.top_comments_limit !== undefined ? item.top_comments_limit : "",
        steamTimeFilter: !isRedditKeywordItem(item) ? item.time_filter || STEAM_DEFAULTS.time_filter : STEAM_DEFAULTS.time_filter,
        steamSort: !isRedditKeywordItem(item) ? item.sort || STEAM_DEFAULTS.sort : STEAM_DEFAULTS.sort,
        steamPostLimit: !isRedditKeywordItem(item) && item.post_limit !== undefined ? item.post_limit : "",
      }));
    } else {
      setForm({
        keyword: "",
        subreddits: "",
        redditTimeFilter: REDDIT_DEFAULTS.time_filter,
        redditSort: REDDIT_DEFAULTS.sort,
        redditPostLimit: "",
        redditTopCommentsLimit: "",
        steamTimeFilter: STEAM_DEFAULTS.time_filter,
        steamSort: STEAM_DEFAULTS.sort,
        steamPostLimit: "",
      });
    }
  }, [item, isOpen, source]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveClick = () => {
    const currentKeyword = form.keyword.trim();
    if (!currentKeyword) {
      alert("Keyword cannot be empty.");
      return;
    }
    let savedItem: KeywordItem;
    if (source === "reddit") {
      const subs = getSubreddits(form.subreddits);
      const postLimit = parseOptionalInt(form.redditPostLimit);
      const commentsLimit = parseOptionalInt(form.redditTopCommentsLimit);
      if (item && isRedditKeywordItem(item)) {
        // Update class instance
        item.keyword = currentKeyword;
        item.subreddits = subs;
        item.time_filter = form.redditTimeFilter;
        item.sort = form.redditSort;
        item.post_limit = postLimit;
        item.top_comments_limit = commentsLimit;
        savedItem = item;
      } else {
        savedItem = new RedditKeywordItem({
          keyword: currentKeyword,
          subreddits: subs,
          time_filter: form.redditTimeFilter,
          sort: form.redditSort,
          post_limit: postLimit,
          top_comments_limit: commentsLimit,
        });
      }
    } else {
      const postLimit = parseOptionalInt(form.steamPostLimit);
      if (item && !isRedditKeywordItem(item)) {
        item.keyword = currentKeyword;
        item.time_filter = form.steamTimeFilter;
        item.sort = form.steamSort;
        item.post_limit = postLimit;
        savedItem = item;
      } else {
        savedItem = new SteamKeywordItem({
          keyword: currentKeyword,
          time_filter: form.steamTimeFilter,
          sort: form.steamSort,
          post_limit: postLimit,
        });
      }
    }
    onSave(savedItem);
    onClose();
  };

  // Use item?.isNew() and item?.isEdited() for modal logic
  const isNew = item ? (typeof item.isNew === "function" ? item.isNew() : false) : true;
  const isEdited = item ? (typeof item.isEdited === "function" ? item.isEdited() : false) : false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white shadow-xl">
        <h2 className="text-xl font-semibold mb-4">
          {isNew ? "Add" : "Edit"} {source} Keyword
        </h2>

        <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label
              htmlFor="keyword"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Keyword *
            </label>
            <input
              id="keyword"
              type="text"
              value={form.keyword}
              onChange={(e) => handleChange("keyword", e.target.value)}
              placeholder="Enter keyword"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              required
            />
          </div>

          {source === "reddit" && (
            <>
              <div>
                <label
                  htmlFor="subreddits"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Subreddits (comma-separated)
                </label>
                <input
                  id="subreddits"
                  type="text"
                  value={form.subreddits}
                  onChange={(e) => handleChange("subreddits", e.target.value)}
                  placeholder="e.g., gamedev, programming"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank for auto-suggestion.
                </p>
              </div>
              <div>
                <label
                  htmlFor="reddit-sort"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Sort By
                </label>
                <select
                  id="reddit-sort"
                  value={form.redditSort}
                  onChange={(e) =>
                    handleChange("redditSort", e.target.value)
                  }
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="top">Top</option>
                  <option value="relevance">Relevance</option>
                  <option value="hot">Hot</option>
                  <option value="new">New</option>
                  <option value="comments">Comments</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="reddit-time"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Time Filter
                </label>
                <select
                  id="reddit-time"
                  value={form.redditTimeFilter}
                  onChange={(e) =>
                    handleChange("redditTimeFilter", e.target.value)
                  }
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="day">Past 24 Hours</option>
                  <option value="all">All Time</option>
                  <option value="year">Past Year</option>
                  <option value="month">Past Month</option>
                  <option value="week">Past Week</option>
                  <option value="hour">Past Hour</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="reddit-post-limit"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Post Limit
                </label>
                <input
                  id="reddit-post-limit"
                  type="number"
                  min="0"
                  value={form.redditPostLimit}
                  onChange={(e) => handleChange("redditPostLimit", e.target.value)}
                  placeholder="Default (6)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Max posts to fetch. 0 or blank for default.
                </p>
              </div>
              <div>
                <label
                  htmlFor="reddit-comments-limit"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Top Comments Limit
                </label>
                <input
                  id="reddit-comments-limit"
                  type="number"
                  min="0"
                  value={form.redditTopCommentsLimit}
                  onChange={(e) => handleChange("redditTopCommentsLimit", e.target.value)}
                  placeholder="Default (2)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Top comments per post. 0 or blank for default.
                </p>
              </div>
            </>
          )}

          {source === "steam" && (
            <>
              <div>
                <label
                  htmlFor="steam-time"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Time Filter
                </label>
                <select
                  id="steam-time"
                  value={form.steamTimeFilter}
                  onChange={(e) =>
                    handleChange("steamTimeFilter", e.target.value)
                  }
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="day">Past Day</option>
                  <option value="all">All Time</option>
                  <option value="year">Past Year</option>
                  <option value="month">Past Month</option>
                  <option value="week">Past Week</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="steam-sort"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Sort By
                </label>
                <select
                  id="steam-sort"
                  value={form.steamSort}
                  onChange={(e) =>
                    handleChange("steamSort", e.target.value)
                  }
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="top">Helpful</option>
                  <option value="created">Created Date</option>
                  <option value="updated">Updated Date</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="steam-post-limit"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Review Limit
                </label>
                <input
                  id="steam-post-limit"
                  type="number"
                  min="0"
                  value={form.steamPostLimit}
                  onChange={(e) => handleChange("steamPostLimit", e.target.value)}
                  placeholder="Default (8)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Max reviews to fetch. 0 or blank for default.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            className={`px-4 py-2 rounded ${
              !isNew && !isEdited
                ? "bg-gray-500 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            disabled={!isNew && !isEdited}
          >
            {isNew ? "Add Keyword" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
