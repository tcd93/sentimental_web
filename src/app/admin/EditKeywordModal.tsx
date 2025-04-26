// src/app/admin/EditKeywordModal.tsx
import { useState, useEffect } from "react";
import { KeywordItem, RedditKeywordItem, SteamKeywordItem, isRedditKeywordItem } from "./types";

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
  const [redditTimeFilter, setRedditTimeFilter] = useState<RedditKeywordItem['time_filter']>('all');
  const [redditSort, setRedditSort] = useState<RedditKeywordItem['sort']>('relevance');
  const [redditPostLimit, setRedditPostLimit] = useState<number | string>(''); // Use string for input compatibility
  const [redditTopCommentsLimit, setRedditTopCommentsLimit] = useState<number | string>(''); // Use string for input compatibility

  const [steamTimeFilter, setSteamTimeFilter] = useState<SteamKeywordItem['time_filter']>('all');
  const [steamSort, setSteamSort] = useState<SteamKeywordItem['sort']>('created');
  const [steamPostLimit, setSteamPostLimit] = useState<number | string>(''); // Use string for input compatibility


  useEffect(() => {
    if (item) {
      setKeyword(item.keyword || "");
      if (isRedditKeywordItem(item)) {
        setSubreddits((item.subreddits ?? []).join(", "));
        setRedditTimeFilter(item.time_filter || 'all');
        setRedditSort(item.sort || 'relevance');
        setRedditPostLimit(item.post_limit ?? '');
        setRedditTopCommentsLimit(item.top_comments_limit ?? '');
        // Reset steam fields
        setSteamTimeFilter('all');
        setSteamSort('created');
        setSteamPostLimit('');
      } else { // SteamKeywordItem
        setSteamTimeFilter(item.time_filter || 'all');
        setSteamSort(item.sort || 'created');
        setSteamPostLimit(item.post_limit ?? '');
         // Reset reddit fields
        setSubreddits("");
        setRedditTimeFilter('all');
        setRedditSort('relevance');
        setRedditPostLimit('');
        setRedditTopCommentsLimit('');
      }
    } else {
      // Reset form for new item based on current source
      setKeyword("");
      if (source === 'reddit') {
        setSubreddits("");
        setRedditTimeFilter('all');
        setRedditSort('relevance');
        setRedditPostLimit('');
        setRedditTopCommentsLimit('');
        setSteamTimeFilter('all'); // Also reset other source defaults
        setSteamSort('created');
        setSteamPostLimit('');
      } else { // steam
        setSteamTimeFilter('all');
        setSteamSort('created');
        setSteamPostLimit('');
        setSubreddits(""); // Also reset other source defaults
        setRedditTimeFilter('all');
        setRedditSort('relevance');
        setRedditPostLimit('');
        setRedditTopCommentsLimit('');
      }
    }
  }, [item, isOpen, source]); // Re-run when modal opens, item changes, or source changes

  const handleSaveClick = () => {
    let savedItem: KeywordItem;

    const parseOptionalInt = (value: number | string): number | undefined => {
        const num = parseInt(String(value), 10);
        return !isNaN(num) && num > 0 ? num : undefined;
    };

    const getSubreddits = (): string[] | undefined => {
        const list = subreddits.split(",").map(s => s.trim()).filter(Boolean);
        return list.length > 0 ? list : undefined;
    }

    const currentKeyword = keyword.trim();
    if (!currentKeyword) {
         alert("Keyword cannot be empty.");
         return;
    }

    let isEdited = false; // Flag to track if changes were made

    if (source === "reddit") {
      const newItemData: Partial<RedditKeywordItem> = {
        keyword: currentKeyword,
        source: "reddit",
        subreddits: getSubreddits(),
        time_filter: redditTimeFilter !== 'all' ? redditTimeFilter : undefined,
        sort: redditSort !== 'relevance' ? redditSort : undefined,
        post_limit: parseOptionalInt(redditPostLimit),
        top_comments_limit: parseOptionalInt(redditTopCommentsLimit),
      };

      savedItem = { ...newItemData } as RedditKeywordItem; // Assume structure is correct initially

      if (!isNewItem && item && isRedditKeywordItem(item)) {
          // Compare fields to determine if edited
          isEdited = (
              item.keyword !== savedItem.keyword ||
              JSON.stringify(item.subreddits ?? []) !== JSON.stringify(savedItem.subreddits ?? []) ||
              (item.time_filter ?? 'all') !== (savedItem.time_filter ?? 'all') ||
              (item.sort ?? 'relevance') !== (savedItem.sort ?? 'relevance') ||
              (item.post_limit ?? undefined) !== (savedItem.post_limit ?? undefined) ||
              (item.top_comments_limit ?? undefined) !== (savedItem.top_comments_limit ?? undefined)
          );
          savedItem.isNew = item.isNew; // Preserve original isNew status
          savedItem.isEdited = item.isNew ? false : isEdited; // Only mark as edited if not new and changed
      } else if (isNewItem) {
           savedItem.isNew = true;
           savedItem.isEdited = false;
      }

    } else { // source === "steam"
      const newItemData: Partial<SteamKeywordItem> = {
        keyword: currentKeyword,
        source: "steam",
        time_filter: steamTimeFilter !== 'all' ? steamTimeFilter : undefined,
        sort: steamSort !== 'created' ? steamSort : undefined,
        post_limit: parseOptionalInt(steamPostLimit),
      };

      savedItem = { ...newItemData } as SteamKeywordItem; // Assume structure is correct

       if (!isNewItem && item && !isRedditKeywordItem(item)) {
          isEdited = (
              item.keyword !== savedItem.keyword ||
              (item.time_filter ?? 'all') !== (savedItem.time_filter ?? 'all') ||
              (item.sort ?? 'created') !== (savedItem.sort ?? 'created') ||
              (item.post_limit ?? undefined) !== (savedItem.post_limit ?? undefined)
          );
           savedItem.isNew = item.isNew;
           savedItem.isEdited = item.isNew ? false : isEdited;
      } else if (isNewItem) {
           savedItem.isNew = true;
           savedItem.isEdited = false;
      }
    }

    onSave(savedItem);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white shadow-xl">
        <h2 className="text-xl font-semibold mb-4">
          {isNewItem ? "Add" : "Edit"} {source} Keyword
        </h2>

        <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto pr-2">
           <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-300 mb-1">Keyword *</label>
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
                <label htmlFor="subreddits" className="block text-sm font-medium text-gray-300 mb-1">Subreddits (comma-separated)</label>
                <input
                  id="subreddits"
                  type="text"
                  value={subreddits}
                  onChange={(e) => setSubreddits(e.target.value)}
                  placeholder="e.g., gamedev, programming"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                 <p className="text-xs text-gray-400 mt-1">Leave blank for auto-suggestion.</p>
              </div>
               <div>
                <label htmlFor="reddit-sort" className="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
                <select
                    id="reddit-sort"
                    value={redditSort}
                    onChange={(e) => setRedditSort(e.target.value as RedditKeywordItem['sort'])}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                    <option value="relevance">Relevance</option>
                    <option value="hot">Hot</option>
                    <option value="top">Top</option>
                    <option value="new">New</option>
                    <option value="comments">Comments</option>
                </select>
              </div>
               <div>
                <label htmlFor="reddit-time" className="block text-sm font-medium text-gray-300 mb-1">Time Filter</label>
                <select
                    id="reddit-time"
                    value={redditTimeFilter}
                    onChange={(e) => setRedditTimeFilter(e.target.value as RedditKeywordItem['time_filter'])}
                     className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                    <option value="all">All Time</option>
                    <option value="year">Past Year</option>
                    <option value="month">Past Month</option>
                    <option value="week">Past Week</option>
                    <option value="day">Past 24 Hours</option>
                    <option value="hour">Past Hour</option>
                </select>
              </div>
               <div>
                <label htmlFor="reddit-post-limit" className="block text-sm font-medium text-gray-300 mb-1">Post Limit</label>
                <input
                  id="reddit-post-limit"
                  type="number"
                  min="0"
                  value={redditPostLimit}
                  onChange={(e) => setRedditPostLimit(e.target.value)}
                  placeholder="Default (e.g., 25)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                 <p className="text-xs text-gray-400 mt-1">Max posts to fetch. 0 or blank for default.</p>
              </div>
               <div>
                <label htmlFor="reddit-comments-limit" className="block text-sm font-medium text-gray-300 mb-1">Top Comments Limit</label>
                <input
                  id="reddit-comments-limit"
                  type="number"
                  min="0"
                  value={redditTopCommentsLimit}
                  onChange={(e) => setRedditTopCommentsLimit(e.target.value)}
                  placeholder="Default (e.g., 5)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                 <p className="text-xs text-gray-400 mt-1">Top comments per post. 0 or blank for default.</p>
              </div>
            </>
          )}

          {source === "steam" && (
            <>
               <div>
                <label htmlFor="steam-time" className="block text-sm font-medium text-gray-300 mb-1">Time Filter</label>
                <select
                    id="steam-time"
                    value={steamTimeFilter}
                    onChange={(e) => setSteamTimeFilter(e.target.value as SteamKeywordItem['time_filter'])}
                     className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                    <option value="all">All Time</option>
                    <option value="year">Past Year</option>
                    <option value="month">Past Month</option>
                    <option value="week">Past Week</option>
                    <option value="day">Past Day</option>
                </select>
              </div>
              <div>
                <label htmlFor="steam-sort" className="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
                <select
                    id="steam-sort"
                    value={steamSort}
                    onChange={(e) => setSteamSort(e.target.value as SteamKeywordItem['sort'])}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                    <option value="created">Created Date</option>
                    <option value="updated">Updated Date</option>
                    <option value="top">Helpful</option>
                 </select>
              </div>
              <div>
                <label htmlFor="steam-post-limit" className="block text-sm font-medium text-gray-300 mb-1">Review Limit</label>
                <input
                  id="steam-post-limit"
                  type="number"
                  min="0"
                  value={steamPostLimit}
                  onChange={(e) => setSteamPostLimit(e.target.value)}
                  placeholder="Default (e.g., 50)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Max reviews to fetch. 0 or blank for default.</p>
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
             {isNewItem ? "Add Keyword" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
} 