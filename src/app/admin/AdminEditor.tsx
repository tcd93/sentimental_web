"use client";
import { useEffect, useState, useRef } from "react";
import EditKeywordModal from "./EditKeywordModal";
import {
  KeywordItem,
  RedditKeywordItem,
  SteamKeywordItem,
  ConfigData,
  isRedditKeywordItem,
} from "./types";

// Define the structure for the cleaned data (matching backend expectation)
type CleanedKeywordItemBase = { keyword: string }; // Base required property
type CleanedRedditItem = CleanedKeywordItemBase &
  Omit<Partial<RedditKeywordItem>, "source" | "isNew" | "isEdited" | "keyword">;
type CleanedSteamItem = CleanedKeywordItemBase &
  Omit<Partial<SteamKeywordItem>, "source" | "isNew" | "isEdited" | "keyword">;
type CleanedKeywordItem = CleanedRedditItem | CleanedSteamItem;

type CleanedConfigForSave = {
  [sourceName: string]: CleanedKeywordItem[];
};

// Helper function to clean config data for saving/display
function getCleanedConfig(
  config: ConfigData | null
): CleanedConfigForSave | null {
  if (!config || !config.source) return null;

  const cleanedOutput: CleanedConfigForSave = {};

  Object.keys(config.source).forEach((sourceKey) => {
    const sourceItems = config.source[sourceKey];
    cleanedOutput[sourceKey] = sourceItems
      .map((item: KeywordItem) => {
        // Create a mutable copy
        const cleanItem: Partial<KeywordItem> = { ...item };
        const itemSource = cleanItem.source; // Store source before deleting

        // Delete properties not needed in the final output
        delete cleanItem.isNew;
        delete cleanItem.isEdited;
        delete cleanItem.source;

        if (itemSource === "reddit") {
          const redditItem = cleanItem as Partial<RedditKeywordItem>; // Already missing source, isNew, isEdited
          if (!redditItem.subreddits || redditItem.subreddits.length === 0)
            delete redditItem.subreddits;
          if (redditItem.sort === "top") delete redditItem.sort;
          if (redditItem.time_filter === "day") delete redditItem.time_filter;
          if (redditItem.post_limit === 6) delete redditItem.post_limit;
          if (redditItem.top_comments_limit === 2)
            delete redditItem.top_comments_limit;
          if (redditItem.post_limit !== undefined && redditItem.post_limit <= 0)
            delete redditItem.post_limit;
          if (
            redditItem.top_comments_limit !== undefined &&
            redditItem.top_comments_limit <= 0
          )
            delete redditItem.top_comments_limit;
        } else if (itemSource === "steam") {
          const steamItem = cleanItem as Partial<SteamKeywordItem>; // Already missing source, isNew, isEdited
          if (steamItem.sort === "top") delete steamItem.sort;
          if (steamItem.time_filter === "day") delete steamItem.time_filter;
          if (steamItem.post_limit === 8) delete steamItem.post_limit;
          if (steamItem.post_limit !== undefined && steamItem.post_limit <= 0)
            delete steamItem.post_limit;
        } else {
          console.error(
            "Item found without valid source during cleaning:",
            item
          );
          return null; // Skip this item
        }

        if (!cleanItem.keyword) {
          console.error("Attempting to clean item without keyword:", item);
          return null; // Skip this item
        }

        // Return the cleaned item
        return cleanItem as CleanedKeywordItem; // Type assertion
      })
      .filter((item): item is CleanedKeywordItem => item !== null);

    // Optional: Remove the source key if it has no valid items left after cleaning
    if (cleanedOutput[sourceKey].length === 0) {
      delete cleanedOutput[sourceKey];
    }
  });

  // Return null if no sources remain after cleaning
  return Object.keys(cleanedOutput).length > 0 ? cleanedOutput : null;
}

export default function AdminEditor() {
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [originalData, setOriginalData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [, setSuccess] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const keywordsContainerRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && data.data[0]) {
          try {
            const parsedData =
              typeof data.data[0] === "string"
                ? JSON.parse(data.data[0])
                : data.data[0];

            // For each item in the parsedData, add the isNew and isEdited flags
            if (parsedData.source) {
              Object.keys(parsedData.source).forEach((source) => {
                parsedData.source[source] = parsedData.source[source].map(
                  (item: { keyword: string; subreddits?: string[] }) => {
                    if (source === "reddit") {
                      return {
                        keyword: item.keyword,
                        subreddits: item.subreddits || [],
                        source: "reddit" as const,
                        isNew: false,
                        isEdited: false,
                      };
                    }
                    return {
                      keyword: item.keyword,
                      source: "steam" as const,
                      isNew: false,
                      isEdited: false,
                    };
                  }
                );
              });
            }

            setConfigData(parsedData);
            setOriginalData(JSON.parse(JSON.stringify(parsedData)));
            if (
              parsedData.source &&
              Object.keys(parsedData.source).length > 0
            ) {
              setActiveSource(Object.keys(parsedData.source)[0]);
            }
          } catch {
            setError("Invalid JSON format");
          }
        } else {
          setError(data.error || "Failed to load config");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load config");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const dataToSave = getCleanedConfig(configData);

      if (!dataToSave) {
        // Adjust error message based on whether there was config data initially
        const hasAnyKeywordsInitially =
          configData?.source &&
          Object.values(configData.source).some((arr) => arr.length > 0);
        if (!hasAnyKeywordsInitially) {
          setError("No keywords configured to save.");
        } else {
          // This case might happen if all items were invalid or filtered out
          setError("No valid data remaining after cleaning defaults.");
        }
        setSaving(false);
        return;
      }

      // The structure of dataToSave is now { sourceName: [items...] }
      // We need to wrap it in { source: ... } if the API expects that exact structure
      const payload = { source: dataToSave };

      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: JSON.stringify(payload) }), // Send the wrapped payload
      });

      if (res.ok) {
        setSuccess(true);
        // After successful save, update the internal state to match the saved structure,
        // but re-hydrated with necessary internal fields (source, isNew=false, isEdited=false).
        if (dataToSave) {
          // dataToSave has the structure { sourceName: [cleanedItems...] }
          const newInternalState: ConfigData = { source: {} };

          Object.keys(dataToSave).forEach((savedSourceKey) => {
            newInternalState.source[savedSourceKey] = dataToSave[
              savedSourceKey
            ].map((cleanedItem) => {
              // Find the original item to potentially merge non-saved but needed UI state? No, simpler is better.
              // Just reconstruct the internal item from the cleaned data.
              return {
                ...cleanedItem, // Spread the properties that were saved
                source: savedSourceKey as "reddit" | "steam", // Add source back
                isNew: false,
                isEdited: false,
                // Ensure required fields for specific types are present, even if empty/default
                ...(savedSourceKey === "reddit" &&
                  !(cleanedItem as Partial<RedditKeywordItem>).subreddits && {
                    subreddits: [],
                  }),
              } as KeywordItem; // Assert as the full KeywordItem for internal state
            });
          });

          // Add back any sources from the original config that might have been empty
          // and thus not included in dataToSave, but should still exist in the UI state.
          if (configData && configData.source) {
            Object.keys(configData.source).forEach((originalSourceKey) => {
              if (!newInternalState.source[originalSourceKey]) {
                // Check if it existed before saving but is now gone
                if (
                  dataToSave &&
                  !dataToSave[originalSourceKey] &&
                  configData.source[originalSourceKey].length > 0
                ) {
                  // This implies all items were invalid/filtered. Keep the source key but empty.
                  newInternalState.source[originalSourceKey] = [];
                } else if (
                  !dataToSave &&
                  configData.source[originalSourceKey]
                ) {
                  // Case where dataToSave itself was null (e.g. no initial keywords)
                  newInternalState.source[originalSourceKey] = [];
                } else if (!newInternalState.source[originalSourceKey]) {
                  // Source was added but never had valid items/saved
                  newInternalState.source[originalSourceKey] = [];
                }
              }
            });
          }

          setConfigData(newInternalState);
          setOriginalData(JSON.parse(JSON.stringify(newInternalState))); // Update original data to match saved state
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save config. Check console for details.");
    } finally {
      setSaving(false);
    }
  }

  function handleRevert() {
    if (originalData) {
      setConfigData(JSON.parse(JSON.stringify(originalData)));
      setError("");
      setSuccess(false);
      setSearchTerm("");
    }
  }

  function handleRemoveKeyword(source: string, index: number) {
    if (!configData || !configData.source[source]) return;
    const updatedData = { ...configData };
    updatedData.source[source].splice(index, 1);
    setConfigData(updatedData);
  }

  function handleAddSource() {
    const sourceName = prompt("Enter new source name:");
    if (
      sourceName &&
      sourceName.trim() &&
      configData &&
      !configData.source[sourceName.trim()]
    ) {
      const trimmedName = sourceName.trim();
      const updatedData = { ...configData };
      if (!updatedData.source) {
        updatedData.source = {};
      }
      updatedData.source[trimmedName] = [];
      setConfigData(updatedData);
      setActiveSource(trimmedName);
    } else if (sourceName && configData?.source[sourceName.trim()]) {
      alert(`Source "${sourceName.trim()}" already exists.`);
    }
  }

  function openAddModal() {
    if (!activeSource) return;
    setIsAddingNewItem(true);
    setCurrentItemIndex(null);
    setIsModalOpen(true);
  }

  function openEditModal(index: number) {
    if (!activeSource || !configData?.source[activeSource]?.[index]) return;
    setIsAddingNewItem(false);
    setCurrentItemIndex(index);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setCurrentItemIndex(null);
    setIsAddingNewItem(false);
  }

  function handleSaveModal(savedItemFromModal: KeywordItem) {
    if (!configData || !activeSource || !originalData || !originalData.source) return;

    const updatedData = JSON.parse(JSON.stringify(configData)); // Deep copy

    // Helper to compare two items for edit status determination
    // This compares against the *original* data, ignoring isNew/isEdited flags themselves
    const itemsDiffer = (itemA: KeywordItem, itemB: KeywordItem): boolean => {
      const cleanA = { ...itemA };
      const cleanB = { ...itemB };
      delete cleanA.isNew;
      delete cleanA.isEdited;
      delete cleanB.isNew;
      delete cleanB.isEdited;

      // Handle potential undefined vs empty array for subreddits
      if (isRedditKeywordItem(cleanA) && isRedditKeywordItem(cleanB)) {
          cleanA.subreddits = cleanA.subreddits ?? [];
          cleanB.subreddits = cleanB.subreddits ?? [];
          // Sort subreddits for consistent comparison
          cleanA.subreddits.sort();
          cleanB.subreddits.sort();
      }

      return JSON.stringify(cleanA) !== JSON.stringify(cleanB);
    };

    if (isAddingNewItem) {
        // New items are always marked isNew: true, isEdited: false initially
        updatedData.source[activeSource].unshift({
            ...savedItemFromModal,
            isNew: true,
            isEdited: false, // New items aren't considered edited yet
        });
    } else if (currentItemIndex !== null) {
        const originalItemForComparison = originalData.source[activeSource]?.[currentItemIndex];

        if (!originalItemForComparison) {
            console.error("Original item not found for comparison during edit save");
            // Fallback: treat it like a new item or just use the incoming flags? Let's log and proceed cautiously.
            // For now, we'll trust the modal's isNew, but mark isEdited false
            updatedData.source[activeSource][currentItemIndex] = {
                ...savedItemFromModal,
                isNew: savedItemFromModal.isNew, // Trust modal if original is missing
                isEdited: false, // Can't compare, so mark as not edited
            };
        } else {
            // Compare the item returned from the modal with the original version
            const hasChangedFromOriginal = itemsDiffer(originalItemForComparison, savedItemFromModal);

            updatedData.source[activeSource][currentItemIndex] = {
                ...savedItemFromModal,
                isNew: originalItemForComparison.isNew, // Preserve original isNew status
                isEdited: !originalItemForComparison.isNew && hasChangedFromOriginal, // Edited if not new AND differs from original
            };
        }
    }

    setConfigData(updatedData);
    handleCloseModal();
  }

  if (loading) return <div className="p-4 text-white">Loading config...</div>;

  const currentSourceExists =
    activeSource && configData?.source && activeSource in configData.source;

  const hasChanges =
    JSON.stringify(configData) !== JSON.stringify(originalData);
  const sources = configData?.source ? Object.keys(configData.source) : [];

  const filteredKeywords =
    currentSourceExists && activeSource
      ? configData.source[activeSource].filter(
          (item) =>
            searchTerm.trim() === "" ||
            item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : [];

  const itemToEdit =
    currentSourceExists && activeSource && currentItemIndex !== null
      ? configData.source[activeSource]?.[currentItemIndex]
      : null;

  const cleanedDataForDisplay = getCleanedConfig(configData);

  return (
    <main className="min-h-screen w-full flex flex-col bg-gray-900 text-white">
      <div className="flex flex-col items-center p-6 w-full">
        <h1 className="text-3xl font-bold mb-6">Admin Config Editor</h1>

        <div className="bg-gray-800 rounded-lg w-full max-w-5xl">
          <div className="border-b border-gray-700 p-0">
            <div className="flex items-center overflow-x-auto">
              {sources.map((source) => (
                <button
                  key={source}
                  className={`py-3 px-6 font-medium whitespace-nowrap ${
                    activeSource === source
                      ? "border-b-2 border-blue-500 text-blue-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  onClick={() => {
                    setActiveSource(source);
                    setSearchTerm("");
                  }}
                >
                  {source}
                </button>
              ))}
              <button
                className="py-3 px-4 text-gray-400 hover:text-gray-200 whitespace-nowrap ml-auto"
                onClick={handleAddSource}
              >
                + Add Source
              </button>
            </div>
          </div>

          {currentSourceExists && activeSource ? (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                  {activeSource} Keywords
                </h2>
                <button
                  onClick={openAddModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  + Add Keyword
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search keywords..."
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              <div
                className="bg-gray-700 rounded-lg max-h-[50vh] overflow-y-auto"
                ref={keywordsContainerRef}
              >
                {filteredKeywords.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                    {filteredKeywords.map((item: KeywordItem) => {
                      const originalIndex = configData.source[
                        activeSource
                      ].findIndex(
                        (k) =>
                          k === item ||
                          (k.keyword === item.keyword &&
                            k.source === item.source)
                      );
                      if (originalIndex === -1) {
                        console.warn(
                          "Could not find original index for item:",
                          item
                        );
                        return null;
                      }

                      let borderClass = "";
                      if (item.isNew) {
                        borderClass = "border-2 border-green-500";
                      } else if (item.isEdited) {
                        borderClass = "border-2 border-yellow-500";
                      }

                      return (
                        <div
                          key={`${activeSource}-${originalIndex}-${item.keyword}`}
                          className={`relative group bg-gray-800 p-3 rounded shadow-md transition-shadow hover:shadow-lg ${borderClass}`}
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
                            {isRedditKeywordItem(item) &&
                              (item.subreddits?.length ?? 0) > 0 && (
                                <p
                                  className="text-xs text-gray-400 truncate"
                                  title={item.subreddits?.join(", ")}
                                >
                                  Subs: {item.subreddits?.join(", ")}
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
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 italic p-4 text-center">
                    {searchTerm
                      ? "No matching keywords found."
                      : "No keywords added for this source yet. Click '+ Add Keyword'."}
                  </p>
                )}
              </div>

              <div className="mt-4 text-sm text-gray-400">
                {configData.source[activeSource].length} keywords total
                {searchTerm && ` (${filteredKeywords.length} matching)`}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {sources.length > 0
                ? "Select a source tab above."
                : "Add a source to get started."}
            </div>
          )}

          <div className="px-6 pb-6">
            <pre className="p-3 bg-gray-800 overflow-x-auto text-sm text-gray-300 max-h-60 overflow-y-auto">
              {/* Display the source-wrapped structure if needed, or just the cleaned data */}
              {cleanedDataForDisplay
                ? JSON.stringify({ source: cleanedDataForDisplay }, null, 2)
                : configData && configData.source
                ? "No valid keywords defined."
                : "Loading..."}
            </pre>
          </div>

          <div className="px-6 pb-6 flex space-x-4 items-center">
            <button
              onClick={handleRevert}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              disabled={!hasChanges}
            >
              Revert Changes
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              disabled={!hasChanges || saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {error && <div className="text-red-400 ml-4 text-sm">{error}</div>}
          </div>
        </div>
      </div>

      {currentSourceExists && activeSource && (
        <EditKeywordModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          item={itemToEdit}
          source={activeSource}
          onSave={handleSaveModal}
          isNewItem={isAddingNewItem}
        />
      )}
    </main>
  );
}
