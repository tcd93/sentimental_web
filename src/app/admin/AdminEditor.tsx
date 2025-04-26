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
      const dataToSave = JSON.parse(JSON.stringify(configData)) as ConfigData;

      if (dataToSave?.source) {
        Object.keys(dataToSave.source).forEach((sourceKey) => {
          const sourceItems = dataToSave.source[sourceKey];
          dataToSave.source[sourceKey] = sourceItems.map((item: KeywordItem) => {
            const { keyword, source, ...rest } = item;
            const cleanItem = { keyword, source, ...rest };

            delete (cleanItem as Partial<KeywordItem>).isNew;
            delete (cleanItem as Partial<KeywordItem>).isEdited;

            if (cleanItem.source === "reddit") {
              const redditItem = cleanItem as Partial<RedditKeywordItem>;
              if (!redditItem.subreddits || redditItem.subreddits.length === 0) delete redditItem.subreddits;
              if (redditItem.time_filter === 'all') delete redditItem.time_filter;
              if (redditItem.sort === 'relevance') delete redditItem.sort;
              if (redditItem.post_limit === undefined || redditItem.post_limit <= 0) delete redditItem.post_limit;
              if (redditItem.top_comments_limit === undefined || redditItem.top_comments_limit <= 0) delete redditItem.top_comments_limit;
            } else if (cleanItem.source === "steam") {
              const steamItem = cleanItem as Partial<SteamKeywordItem>;
              if (steamItem.time_filter === 'all') delete steamItem.time_filter;
              if (steamItem.sort === 'created') delete steamItem.sort;
              if (steamItem.post_limit === undefined || steamItem.post_limit <= 0) delete steamItem.post_limit;
            } else {
               console.error("Item found without valid source during save:", cleanItem);
               return null;
            }

            if (!cleanItem.keyword) {
              console.error("Attempting to save item without keyword:", cleanItem);
              return null;
            }

            return cleanItem as KeywordItem;
          }).filter(Boolean) as KeywordItem[];
        });
      } else {
         setError("No data to save.");
         setSaving(false);
         return;
      }

      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: JSON.stringify(dataToSave) }),
      });

      if (res.ok) {
        setSuccess(true);
        if (configData && configData.source) {
           const savedState = JSON.parse(JSON.stringify(dataToSave));
           Object.keys(savedState.source).forEach(sourceKey => {
               savedState.source[sourceKey] = savedState.source[sourceKey].map((item: KeywordItem) => ({
                   ...item,
                   isNew: false,
                   isEdited: false,
                   ...(isRedditKeywordItem(item) && { subreddits: item.subreddits ?? [] }),
               }));
           });
          setConfigData(savedState);
          setOriginalData(JSON.parse(JSON.stringify(savedState)));
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
    if (sourceName && sourceName.trim() && configData && !configData.source[sourceName.trim()]) {
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

  function handleSaveModal(savedItem: KeywordItem) {
    if (!configData || !activeSource) return;

    const updatedData = { ...configData };

    if (isAddingNewItem) {
      updatedData.source[activeSource].unshift({
          ...savedItem,
          isNew: true,
          isEdited: false
      });
    } else if (currentItemIndex !== null) {
      const originalItem = configData.source[activeSource][currentItemIndex];
      updatedData.source[activeSource][currentItemIndex] = {
        ...savedItem,
        isNew: originalItem.isNew,
        isEdited: originalItem.isNew ? false : savedItem.isEdited,
      };
    }

    setConfigData(updatedData);
    handleCloseModal();
  }

  if (loading) return <div className="p-4 text-white">Loading config...</div>;

  const currentSourceExists = activeSource && configData?.source && activeSource in configData.source;

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

  const itemToEdit = currentSourceExists && activeSource && currentItemIndex !== null
      ? configData.source[activeSource]?.[currentItemIndex]
      : null;

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
                    {filteredKeywords.map(
                      (item: KeywordItem) => {
                        const originalIndex = configData.source[activeSource].findIndex(
                            (k) => k === item || (k.keyword === item.keyword && k.source === item.source)
                        );
                        if (originalIndex === -1) {
                             console.warn("Could not find original index for item:", item);
                             return null;
                        };

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
                            <div onClick={() => openEditModal(originalIndex)} className="cursor-pointer min-h-[40px]">
                                <h4 className="font-semibold text-white truncate mb-1" title={item.keyword}>{item.keyword}</h4>
                                {isRedditKeywordItem(item) && (item.subreddits?.length ?? 0) > 0 && (
                                  <p className="text-xs text-gray-400 truncate" title={item.subreddits?.join(", ")}>
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
                      }
                    )}
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
                 {sources.length > 0 ? "Select a source tab above." : "Add a source to get started."}
             </div>
          )}

          <div className="px-6 pb-6">
            <pre className="p-3 bg-gray-800 overflow-x-auto text-sm text-gray-300 max-h-60 overflow-y-auto">
                {configData ? JSON.stringify(configData, null, 2) : "Loading..."}
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

            {error && (
              <div className="text-red-400 ml-4 text-sm">{error}</div>
            )}
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
