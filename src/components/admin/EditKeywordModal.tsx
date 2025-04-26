// src/app/admin/EditKeywordModal.tsx
import { useState, useEffect } from "react";
import {
  KeywordItem,
  RedditKeywordItemSchema,
  SteamKeywordItemSchema,
  RedditSortEnum,
  RedditTimeFilterEnum,
  SteamSortEnum,
  SteamTimeFilterEnum,
  RedditKeywordItem,
  SteamKeywordItem,
} from "../../lib/types/admin/types";

interface EditKeywordModalProps {
  onClose: () => void;
  item: KeywordItem | null;
  source: string;
  onSave: (item: KeywordItem) => void;
}

export default function EditKeywordModal({
  onClose,
  item,
  source,
  onSave,
}: EditKeywordModalProps) {
  // --- State for editing and original item instance ---
  const [editingItem, setEditingItem] = useState<KeywordItem | null>(null);
  const [originalItem, setOriginalItem] = useState<KeywordItem | null>(null);

  useEffect(() => {
    if (item) {
      setEditingItem(item);
      setOriginalItem(item);
    } else {
      setEditingItem({ keyword: "" });
      setOriginalItem(null);
    }
  }, [item, source]);

  function handleFieldChange(field: string, value: string) {
    setEditingItem((prev) => {
      if (!prev) return prev;
      if (source === "reddit") {
        const updated = { ...prev } as RedditKeywordItem;
        if (field === "keyword") updated.keyword = value;
        else if (field === "subreddits") {
          updated.subreddits = value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (field === "redditTimeFilter") {
          updated.time_filter = value as typeof RedditTimeFilterEnum._type;
        } else if (field === "redditSort") {
          updated.sort = value as typeof RedditSortEnum._type;
        } else if (field === "redditPostLimit") {
          updated.post_limit = value === "" ? undefined : parseInt(value, 10);
        } else if (field === "redditTopCommentsLimit") {
          updated.top_comments_limit =
            value === "" ? undefined : parseInt(value, 10);
        }
        return RedditKeywordItemSchema.parse(updated);
      } else {
        const updated = { ...prev } as SteamKeywordItem;
        if (field === "keyword") updated.keyword = value.trim();
        else if (field === "steamTimeFilter") {
          updated.time_filter = value as typeof SteamTimeFilterEnum._type;
        } else if (field === "steamSort") {
          updated.sort = value as typeof SteamSortEnum._type;
        } else if (field === "steamPostLimit") {
          updated.post_limit = value === "" ? undefined : parseInt(value, 10);
        }
        return SteamKeywordItemSchema.parse(updated);
      }
    });
  }

  // Deep compare for isEdited
  function isEdited() {
    if (!originalItem || !editingItem) return false;
    return JSON.stringify(editingItem) !== JSON.stringify(originalItem);
  }
  const isNew = originalItem === null;

  if (!editingItem) return null;

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
              value={editingItem.keyword}
              onChange={(e) => handleFieldChange("keyword", e.target.value)}
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
                  value={(editingItem as RedditKeywordItem).subreddits?.join(", ") || ""}
                  onChange={(e) =>
                    handleFieldChange("subreddits", e.target.value)
                  }
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
                  value={editingItem.sort || RedditSortEnum.options[2]}
                  onChange={(e) => handleFieldChange("redditSort", e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  {RedditSortEnum.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
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
                  value={editingItem.time_filter || RedditTimeFilterEnum.options[4]}
                  onChange={(e) => handleFieldChange("redditTimeFilter", e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  {RedditTimeFilterEnum.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "day"
                        ? "Past 24 Hours"
                        : opt === "all"
                        ? "All Time"
                        : opt === "year"
                        ? "Past Year"
                        : opt === "month"
                        ? "Past Month"
                        : opt === "week"
                        ? "Past Week"
                        : opt === "hour"
                        ? "Past Hour"
                        : opt}
                    </option>
                  ))}
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
                  value={editingItem.post_limit ?? ""}
                  onChange={(e) =>
                    handleFieldChange("redditPostLimit", e.target.value)
                  }
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
                  value={(editingItem as RedditKeywordItem).top_comments_limit ?? ""}
                  onChange={(e) =>
                    handleFieldChange("redditTopCommentsLimit", e.target.value)
                  }
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
                  value={editingItem.time_filter || SteamTimeFilterEnum.options[4]}
                  onChange={(e) => handleFieldChange("steamTimeFilter", e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  {SteamTimeFilterEnum.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "day"
                        ? "Past Day"
                        : opt === "all"
                        ? "All Time"
                        : opt === "year"
                        ? "Past Year"
                        : opt === "month"
                        ? "Past Month"
                        : opt === "week"
                        ? "Past Week"
                        : opt}
                    </option>
                  ))}
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
                  value={editingItem.sort || SteamSortEnum.options[2]}
                  onChange={(e) => handleFieldChange("steamSort", e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  {SteamSortEnum.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "top"
                        ? "Helpful"
                        : opt === "created"
                        ? "Created Date"
                        : opt === "updated"
                        ? "Updated Date"
                        : opt}
                    </option>
                  ))}
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
                  value={editingItem.post_limit ?? ""}
                  onChange={(e) =>
                    handleFieldChange("steamPostLimit", e.target.value)
                  }
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
            onClick={() => {
              if (editingItem) {
                onSave(editingItem);
                onClose();
              }
            }}
            className={`px-4 py-2 rounded ${
              !isNew && !isEdited()
                ? "bg-gray-500 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            disabled={!isNew && !isEdited()}
          >
            {isNew ? "Add Keyword" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
