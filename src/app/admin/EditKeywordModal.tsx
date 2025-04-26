// src/app/admin/EditKeywordModal.tsx
import { useState, useEffect } from "react";
import {
  KeywordItem,
  RedditKeywordItem,
  SteamKeywordItem,
  isRedditKeywordItem,
} from "./types";

interface EditKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: KeywordItem | null; // Allow null for adding new items
  source: string; // 'reddit' or 'steam' - determines which fields to show
  onSave: (item: KeywordItem) => void;
  isNewItem: boolean; // Flag to differentiate add vs edit
}

export default function EditKeywordModal({
  isOpen,
  onClose,
  item,
  source,
  onSave,
  isNewItem,
}: EditKeywordModalProps) {
  // --- State for form fields ---
  const [keyword, setKeyword] = useState("");
  const [subreddits, setSubreddits] = useState("");
  const [redditTimeFilter, setRedditTimeFilter] =
    useState<RedditKeywordItem["time_filter"]>("day");
  const [redditSort, setRedditSort] =
    useState<RedditKeywordItem["sort"]>("top");
  const [redditPostLimit, setRedditPostLimit] = useState<number | string>(""); // Use string for input compatibility
  const [redditTopCommentsLimit, setRedditTopCommentsLimit] = useState<
    number | string
  >(""); // Use string for input compatibility

  const [steamTimeFilter, setSteamTimeFilter] =
    useState<SteamKeywordItem["time_filter"]>("day");
  const [steamSort, setSteamSort] = useState<SteamKeywordItem["sort"]>("top");
  const [steamPostLimit, setSteamPostLimit] = useState<number | string>(""); // Use string for input compatibility

  useEffect(() => {
    if (item) {
      setKeyword(item.keyword || "");
      if (isRedditKeywordItem(item)) {
        setSubreddits((item.subreddits ?? []).join(", "));
        setRedditTimeFilter(item.time_filter || "day");
        setRedditSort(item.sort || "top");
        setRedditPostLimit(item.post_limit ?? "");
        setRedditTopCommentsLimit(item.top_comments_limit ?? "");
        // Reset steam fields to *their* backend defaults
        setSteamTimeFilter("day");
        setSteamSort("top");
        setSteamPostLimit("");
      } else {
        // SteamKeywordItem
        setSteamTimeFilter(item.time_filter || "day");
        setSteamSort(item.sort || "top");
        setSteamPostLimit(item.post_limit ?? "");
        // Reset reddit fields to *their* backend defaults
        setSubreddits("");
        setRedditTimeFilter("day");
        setRedditSort("top");
        setRedditPostLimit("");
        setRedditTopCommentsLimit("");
      }
    } else {
      // Reset form for new item based on current source to backend defaults
      setKeyword("");
      setSubreddits("");
      setRedditTimeFilter("day");
      setRedditSort("top");
      setRedditPostLimit("");
      setRedditTopCommentsLimit("");
      setSteamTimeFilter("day");
      setSteamSort("top");
      setSteamPostLimit("");
      // No need to check source, just reset all to their respective defaults
    }
  }, [item, isOpen, source]); // Re-run when modal opens, item changes, or source changes

  const handleSaveClick = () => {
    let savedItem: KeywordItem;

    const parseOptionalInt = (value: number | string): number | undefined => {
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num > 0 ? num : undefined;
    };

    const getSubreddits = (): string[] | undefined => {
      const list = subreddits
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return list.length > 0 ? list : undefined; // Keep undefined if empty
    };

    const currentKeyword = keyword.trim();
    if (!currentKeyword) {
      alert("Keyword cannot be empty.");
      return;
    }

    if (source === "reddit") {
      // Construct the base object without isNew or isEdited
      const newItemData: Partial<RedditKeywordItem> = {
        keyword: currentKeyword,
        source: "reddit",
      };
      const subs = getSubreddits();
      if (subs) newItemData.subreddits = subs;
      if (redditTimeFilter !== "day")
        newItemData.time_filter = redditTimeFilter;
      if (redditSort !== "top") newItemData.sort = redditSort;
      const postLimit = parseOptionalInt(redditPostLimit);
      // Always include the value if present, even if default,
      // AdminEditor will handle comparison with originalData
      if (postLimit !== undefined)
        newItemData.post_limit = postLimit;
      const commentsLimit = parseOptionalInt(redditTopCommentsLimit);
      if (commentsLimit !== undefined)
        newItemData.top_comments_limit = commentsLimit;

      // Ensure all potential fields are included if they exist, even if default
      savedItem = {
          keyword: currentKeyword,
          source: "reddit",
          subreddits: subs,
          time_filter: redditTimeFilter,
          sort: redditSort,
          post_limit: postLimit,
          top_comments_limit: commentsLimit,
          isNew: isNewItem, // Keep isNew status
          // isEdited will be determined by AdminEditor
      } as RedditKeywordItem;

    } else { // source === "steam"
      // Construct the base object without isNew or isEdited
      const newItemData: Partial<SteamKeywordItem> = {
        keyword: currentKeyword,
        source: "steam",
      };
      if (steamTimeFilter !== "day") newItemData.time_filter = steamTimeFilter;
      if (steamSort !== "top") newItemData.sort = steamSort;
      const postLimit = parseOptionalInt(steamPostLimit);
      // Always include the value if present, even if default
      if (postLimit !== undefined)
        newItemData.post_limit = postLimit;

      // Ensure all potential fields are included if they exist, even if default
      savedItem = {
          keyword: currentKeyword,
          source: "steam",
          time_filter: steamTimeFilter,
          sort: steamSort,
          post_limit: postLimit,
          isNew: isNewItem, // Keep isNew status
          // isEdited will be determined by AdminEditor
      } as SteamKeywordItem;
    }

    // Just call onSave with the constructed item
    onSave(savedItem);
    onClose();
  };

  // --- Calculate if changes were made *within this modal session* ---
  // Renamed from isActuallyEdited to hasModalChanges for clarity
  let hasModalChanges = false;
  if (!isNewItem && item) {
    const parseOptionalInt = (value: number | string): number | undefined => {
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num > 0 ? num : undefined;
    };
    const currentKeywordTrimmed = keyword.trim(); // Use trimmed value for comparison

    if (source === "reddit" && isRedditKeywordItem(item)) {
      const currentSubreddits = subreddits.split(",").map(s => s.trim()).filter(Boolean);
      const originalSubreddits = item.subreddits ?? [];
      // Handle potential empty string vs undefined from input vs original item state
      const currentPostLimit = parseOptionalInt(redditPostLimit);
      const currentCommentsLimit = parseOptionalInt(redditTopCommentsLimit);
      const originalPostLimit = item.post_limit; // Can be undefined
      const originalCommentsLimit = item.top_comments_limit; // Can be undefined

      hasModalChanges =
        (item.keyword || "") !== currentKeywordTrimmed || // Compare against original item's keyword
        JSON.stringify(originalSubreddits.sort()) !== JSON.stringify(currentSubreddits.sort()) ||
        (item.time_filter || "day") !== redditTimeFilter ||
        (item.sort || "top") !== redditSort ||
        originalPostLimit !== currentPostLimit || // Direct comparison handles undefined correctly
        originalCommentsLimit !== currentCommentsLimit; // Direct comparison

    } else if (source === "steam" && !isRedditKeywordItem(item)) {
        const currentPostLimit = parseOptionalInt(steamPostLimit);
        const originalPostLimit = item.post_limit; // Can be undefined

        hasModalChanges =
            (item.keyword || "") !== currentKeywordTrimmed || // Compare against original item's keyword
            (item.time_filter || "day") !== steamTimeFilter ||
            (item.sort || "top") !== steamSort ||
            originalPostLimit !== currentPostLimit; // Direct comparison
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white shadow-xl">
        <h2 className="text-xl font-semibold mb-4">
          {isNewItem ? "Add" : "Edit"} {source} Keyword
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
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
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
                  value={subreddits}
                  onChange={(e) => setSubreddits(e.target.value)}
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
                  value={redditSort}
                  onChange={(e) =>
                    setRedditSort(e.target.value as RedditKeywordItem["sort"])
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
                  value={redditTimeFilter}
                  onChange={(e) =>
                    setRedditTimeFilter(
                      e.target.value as RedditKeywordItem["time_filter"]
                    )
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
                  value={redditPostLimit}
                  onChange={(e) => setRedditPostLimit(e.target.value)}
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
                  value={redditTopCommentsLimit}
                  onChange={(e) => setRedditTopCommentsLimit(e.target.value)}
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
                  value={steamTimeFilter}
                  onChange={(e) =>
                    setSteamTimeFilter(
                      e.target.value as SteamKeywordItem["time_filter"]
                    )
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
                  value={steamSort}
                  onChange={(e) =>
                    setSteamSort(e.target.value as SteamKeywordItem["sort"])
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
                  value={steamPostLimit}
                  onChange={(e) => setSteamPostLimit(e.target.value)}
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
              !isNewItem && !hasModalChanges // Use hasModalChanges here
                ? "bg-gray-500 text-gray-400 cursor-not-allowed" // Disabled style
                : "bg-blue-600 text-white hover:bg-blue-700" // Enabled style
            }`}
            disabled={!isNewItem && !hasModalChanges} // Use hasModalChanges here
          >
            {isNewItem ? "Add Keyword" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
