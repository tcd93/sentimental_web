import React from "react";
import { KeywordItem, RedditKeywordItem } from "../../lib/types/admin/types";

type KeywordChipsGridProps = {
  filteredKeywords: KeywordItem[];
  activeSource: "reddit" | "steam";
  openEditModal: (index: number) => void;
  handleRemoveKeyword: (source: "reddit" | "steam", index: number) => void;
  searchTerm: string;
};

const KeywordChipsGrid: React.FC<KeywordChipsGridProps> = ({
  filteredKeywords,
  activeSource,
  openEditModal,
  handleRemoveKeyword,
  searchTerm,
}) => (
  <div className="rounded-lg max-h-[30vh] overflow-y-auto scrollbar scrollbar-thumb-gray-700 scrollbar-track-gray-800">
    {filteredKeywords.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredKeywords.map((item: KeywordItem, originalIndex: number) => (
          <div
            key={`${activeSource}-${originalIndex}-${item.keyword}`}
            className={`relative group bg-gray-700 p-3 rounded shadow-md transition-shadow hover:shadow-lg`}
          >
            <div
              onClick={() => openEditModal(originalIndex)}
              className="cursor-pointer min-h-[40px]"
            >
              <h4
                className="font-semibold text-white truncate mb-1"
                title={item.keyword}
              >
                {item.keyword}
              </h4>
              {activeSource === "reddit" &&
                ((item as RedditKeywordItem).subreddits?.length ?? 0) > 0 && (
                  <p
                    className="text-xs text-gray-400 truncate"
                    title={(item as RedditKeywordItem).subreddits?.join(", ")}
                  >
                    Subs: {(item as RedditKeywordItem).subreddits?.join(", ")}
                  </p>
                )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveKeyword(activeSource, originalIndex);
              }}
              className="absolute top-1 right-1 p-1 text-red-400 hover:text-red-200 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 rounded-full leading-none flex items-center justify-center w-5 h-5"
              aria-label="Remove keyword"
            >
              <span className="text-xs -mt-px">✕</span>
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-400 italic p-4 text-center">
        {searchTerm
          ? "No matching keywords found."
          : "No keywords added for this source yet. Click '+ Add Keyword'."}
      </p>
    )}
  </div>
);

export default KeywordChipsGrid;
