// src/app/admin/EditKeywordModal.tsx
import { useState, useEffect } from "react";
import { KeywordItem, ModalState, RedditKeywordItem, SteamKeywordItem } from "./types";

interface EditKeywordModalProps {
  onClose: () => void;
  modalState: ModalState;
  source: string;
  onSave: (item: RedditKeywordItem | SteamKeywordItem) => void;
}

export default function EditKeywordModal({
  onClose,
  modalState,
  source,
  onSave,
}: EditKeywordModalProps) {
  // --- State for editing and original item instance ---
  const [editingItem, setEditingItem] = useState<KeywordItem | null>(null);
  const [originalItem, setOriginalItem] = useState<KeywordItem | null>(null);

  useEffect(() => {
    if (!modalState.open) {
      setEditingItem(null);
      setOriginalItem(null);
      return;
    }
    if (modalState.item) {
      setEditingItem(
        modalState.item.source === "reddit"
          ? new RedditKeywordItem({ ...modalState.item })
          : new SteamKeywordItem({ ...modalState.item })
      );
      setOriginalItem(
        modalState.item.source === "reddit"
          ? new RedditKeywordItem({ ...modalState.item })
          : new SteamKeywordItem({ ...modalState.item })
      );
    } else {
      setEditingItem(
        source === "reddit"
          ? new RedditKeywordItem({ keyword: "" })
          : new SteamKeywordItem({ keyword: "" })
      );
      setOriginalItem(null);
    }
  }, [modalState, source]);

  function handleFieldChange(field: string, value: string) {
    setEditingItem((prev) => {
      if (!prev) return prev;
      if (prev.source === "reddit") {
        const updated = new RedditKeywordItem({ ...prev });
        if (field === "keyword") updated.keyword = value;
        else if (field === "subreddits") {
          updated.subreddits = value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (field === "redditTimeFilter") {
          updated.time_filter = value as import("./types").RedditTimeFilter;
        } else if (field === "redditSort") {
          updated.sort = value as import("./types").RedditSort;
        } else if (field === "redditPostLimit") {
          updated.post_limit = value === "" ? undefined : parseInt(value, 10);
        } else if (field === "redditTopCommentsLimit") {
          updated.top_comments_limit =
            value === "" ? undefined : parseInt(value, 10);
        }
        return updated;
      } else {
        const updated = new SteamKeywordItem({ ...prev });
        if (field === "keyword") updated.keyword = value.trim();
        else if (field === "steamTimeFilter") {
          updated.time_filter = value as import("./types").SteamTimeFilter;
        } else if (field === "steamSort") {
          updated.sort = value as import("./types").SteamSort;
        } else if (field === "steamPostLimit") {
          updated.post_limit = value === "" ? undefined : parseInt(value, 10);
        }
        return updated;
      }
    });
  }

  // Deep compare for isEdited
  function isEdited() {
    if (!originalItem || !editingItem) return false;
    return JSON.stringify(editingItem) !== JSON.stringify(originalItem);
  }
  const isNew = originalItem === null;

  if (!modalState.open || !editingItem) return null;

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
          {editingItem.source === "reddit" && (
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
                  value={editingItem.subreddits?.join(", ") || ""}
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
                  value={editingItem.sort || "top"}
                  onChange={(e) =>
                    handleFieldChange("redditSort", e.target.value)
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
                  value={editingItem.time_filter || "day"}
                  onChange={(e) =>
                    handleFieldChange("redditTimeFilter", e.target.value)
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
                  value={editingItem.top_comments_limit ?? ""}
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
          {editingItem.source === "steam" && (
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
                  value={editingItem.time_filter || "day"}
                  onChange={(e) =>
                    handleFieldChange("steamTimeFilter", e.target.value)
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
                  value={editingItem.sort || "top"}
                  onChange={(e) =>
                    handleFieldChange("steamSort", e.target.value)
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
