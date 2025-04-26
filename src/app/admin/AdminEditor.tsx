"use client";
import { useReducer, useEffect, useState, useRef } from "react";
import EditKeywordModal from "./EditKeywordModal";
import {
  KeywordItem,
  RedditKeywordItem,
  SteamKeywordItem,
  ConfigData,
  isRedditKeywordItem,
  ModalState,
} from "./types";
import { adminStatusReducer, getCleanedConfig } from "./utils";

export default function AdminEditor() {
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [originalData, setOriginalData] = useState<ConfigData | null>(null);
  const [status, dispatchStatus] = useReducer(adminStatusReducer, {
    loading: true,
    saving: false,
    error: "",
    success: false,
  });
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const keywordsContainerRef = useRef<HTMLDivElement>(null);

  const [modalState, setModalState] = useState<ModalState>({ open: false });

  useEffect(() => {
    dispatchStatus({ type: "LOADING" });
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && data.data[0]) {
          try {
            const parsedData =
              typeof data.data[0] === "string"
                ? JSON.parse(data.data[0])
                : data.data[0];
            if (parsedData.source) {
              Object.keys(parsedData.source).forEach((source) => {
                parsedData.source[source] = parsedData.source[source].map(
                  (item: unknown) => {
                    if (source === "reddit") {
                      return new RedditKeywordItem(
                        item as Partial<RedditKeywordItem>
                      );
                    }
                    return new SteamKeywordItem(
                      item as Partial<SteamKeywordItem>
                    );
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
            dispatchStatus({ type: "LOADED" });
          } catch {
            dispatchStatus({ type: "ERROR", error: "Invalid JSON format" });
          }
        } else {
          dispatchStatus({
            type: "ERROR",
            error: data.error || "Failed to load config",
          });
        }
      })
      .catch(() => {
        dispatchStatus({ type: "ERROR", error: "Failed to load config" });
      });
  }, []);

  async function handleSave() {
    dispatchStatus({ type: "SAVING" });
    try {
      const dataToSave = getCleanedConfig(configData);
      if (!dataToSave) {
        const hasAnyKeywordsInitially =
          configData?.source &&
          Object.values(configData.source).some((arr) => arr.length > 0);
        if (!hasAnyKeywordsInitially) {
          dispatchStatus({
            type: "ERROR",
            error: "No keywords configured to save.",
          });
        } else {
          dispatchStatus({
            type: "ERROR",
            error: "No valid data remaining after cleaning defaults.",
          });
        }
        return;
      }
      const payload = { source: dataToSave };
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: JSON.stringify(payload) }),
      });
      if (res.ok) {
        dispatchStatus({ type: "SAVED" });
        if (dataToSave) {
          const newInternalState: ConfigData = { source: {} };
          Object.keys(dataToSave).forEach((savedSourceKey) => {
            newInternalState.source[savedSourceKey] = dataToSave[
              savedSourceKey
            ].map((cleanedItem) => {
              return {
                ...cleanedItem,
                source: savedSourceKey as "reddit" | "steam",
                ...(savedSourceKey === "reddit" &&
                  !(cleanedItem as Partial<RedditKeywordItem>).subreddits && {
                    subreddits: [],
                  }),
              } as KeywordItem;
            });
          });
          if (configData && configData.source) {
            Object.keys(configData.source).forEach((originalSourceKey) => {
              if (!newInternalState.source[originalSourceKey]) {
                if (
                  dataToSave &&
                  !dataToSave[originalSourceKey] &&
                  configData.source[originalSourceKey].length > 0
                ) {
                  newInternalState.source[originalSourceKey] = [];
                } else if (
                  !dataToSave &&
                  configData.source[originalSourceKey]
                ) {
                  newInternalState.source[originalSourceKey] = [];
                } else if (!newInternalState.source[originalSourceKey]) {
                  newInternalState.source[originalSourceKey] = [];
                }
              }
            });
          }
          setConfigData(newInternalState);
          setOriginalData(JSON.parse(JSON.stringify(newInternalState)));
        }
      } else {
        const data = await res.json();
        dispatchStatus({
          type: "ERROR",
          error: data.error || "Failed to save",
        });
      }
    } catch (err) {
      console.error("Save error:", err);
      dispatchStatus({
        type: "ERROR",
        error: "Failed to save config. Check console for details.",
      });
    }
  }

  function handleRevert() {
    if (originalData) {
      // Deep clone and re-wrap as class instances
      const cloned = JSON.parse(JSON.stringify(originalData));
      if (cloned.source) {
        Object.keys(cloned.source).forEach((source) => {
          cloned.source[source] = cloned.source[source].map((item: unknown) =>
            source === "reddit"
              ? new RedditKeywordItem(item as Partial<RedditKeywordItem>)
              : new SteamKeywordItem(item as Partial<SteamKeywordItem>)
          );
        });
      }
      setConfigData(cloned);
      dispatchStatus({ type: "RESET" });
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
    setModalState({ open: true, index: null, isNew: true });
  }

  function openEditModal(index: number) {
    if (!activeSource || !configData?.source[activeSource]?.[index]) return;
    setModalState({ open: true, index, isNew: false });
  }

  function handleCloseModal() {
    setModalState({ open: false });
  }

  function handleSaveModal(savedItemFromModal: KeywordItem) {
    if (!configData || !activeSource) return;
    const updatedData = { ...configData };
    if (modalState.open && modalState.isNew) {
      updatedData.source[activeSource].unshift(savedItemFromModal);
    } else if (modalState.open && modalState.index !== null) {
      updatedData.source[activeSource][modalState.index] = savedItemFromModal;
    }
    setConfigData(updatedData);
    handleCloseModal();
  }

  if (status.loading)
    return <div className="p-4 text-white">Loading config...</div>;

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

  const isModalOpen = modalState.open;
  const currentItemIndex = modalState.open ? modalState.index : null;

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
                      if (
                        item.isNew &&
                        typeof item.isNew === "function" &&
                        item.isNew()
                      ) {
                        borderClass = "border-2 border-green-500";
                      } else if (
                        item.isEdited &&
                        typeof item.isEdited === "function" &&
                        item.isEdited()
                      ) {
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
              disabled={!hasChanges || status.saving}
            >
              {status.saving ? "Saving..." : "Save Changes"}
            </button>
            {status.error && (
              <div className="text-red-400 ml-4 text-sm">{status.error}</div>
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
        />
      )}
    </main>
  );
}
