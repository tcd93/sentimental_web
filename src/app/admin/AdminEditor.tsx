"use client";
import { useReducer, useEffect, useState } from "react";
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
  const [configData, setConfigData] = useState<ConfigData>();
  const [status, dispatchStatus] = useReducer(adminStatusReducer, {
    loading: true,
    saving: false,
    error: "",
    success: false,
  });
  // Only allow 'reddit' or 'steam' as activeSource
  const sources: ("reddit" | "steam")[] = ["reddit", "steam"];
  const [activeSource, setActiveSource] = useState<"reddit" | "steam">(
    "reddit"
  );
  const [searchTerm, setSearchTerm] = useState("");
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
            if (
              parsedData.source &&
              Object.keys(parsedData.source).length > 0
            ) {
              setActiveSource(
                Object.keys(parsedData.source)[0] as "reddit" | "steam"
              );
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
    if (!configData) {
      dispatchStatus({ type: "ERROR", error: "No config data to save." });
      return;
    }
    dispatchStatus({ type: "SAVING" });
    try {
      const dataToSave = getCleanedConfig(configData);
      if (!dataToSave) {
        dispatchStatus({
          type: "ERROR",
          error: "No valid data remaining after cleaning defaults.",
        });
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
        setConfigData((parsedData) => parsedData); // No revert/restore logic
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

  function handleRemoveKeyword(source: "reddit" | "steam", index: number) {
    if (!configData || !configData.source[source]) return;
    const updatedData = { ...configData };
    updatedData.source[source].splice(index, 1);
    setConfigData(updatedData);
  }

  function openAddModal() {
    if (!activeSource) return;
    setModalState({ open: true, index: null, item: null });
  }

  function openEditModal(index: number) {
    if (!activeSource || !configData?.source[activeSource]?.[index]) return;
    setModalState({
      open: true,
      index,
      item: configData.source[activeSource][index],
    });
  }

  function handleCloseModal() {
    setModalState({ open: false });
  }

  function handleSaveModal(
    savedItemFromModal: RedditKeywordItem | SteamKeywordItem
  ) {
    if (!configData || !activeSource) return;
    const updatedData = { ...configData };
    if (modalState.open && modalState.index === null) {
      if (activeSource === "reddit") {
        savedItemFromModal = new RedditKeywordItem(
          savedItemFromModal as Partial<RedditKeywordItem>
        );
      }
      if (activeSource === "steam") {
        savedItemFromModal = new SteamKeywordItem(
          savedItemFromModal as Partial<SteamKeywordItem>
        );
      }
    } else if (modalState.open && modalState.index !== null) {
      updatedData.source[activeSource][modalState.index] = savedItemFromModal;
    }
    setConfigData(updatedData);
    handleCloseModal();
  }

  if (status.loading)
    return <div className="p-4 text-white">Loading config...</div>;

  const filteredKeywords = configData?.source[activeSource].filter(
    (item) =>
      searchTerm.trim() === "" ||
      item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  if (!configData) {
    dispatchStatus({ type: "ERROR", error: "No config data available." });
    return <div className="p-4 text-white">No config data available.</div>;
  }

  const cleanedDataForDisplay = getCleanedConfig(configData);
  const isModalOpen = modalState.open;

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
            </div>
          </div>

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

            <div className="rounded-lg max-h-[30vh] overflow-y-auto scrollbar scrollbar-thumb-gray-700 scrollbar-track-gray-800">
              {filteredKeywords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredKeywords.map(
                    (item: KeywordItem, originalIndex: number) => (
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
                    )
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

          <div className="px-6 pb-6">
            <pre className="p-3 bg-gray-800 overflow-x-auto text-sm text-gray-300 max-h-60 overflow-y-auto scrollbar scrollbar-thumb-gray-700 scrollbar-track-gray-800">
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
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              // Save is always enabled for now
            >
              {status.saving ? "Saving..." : "Save Changes"}
            </button>
            {status.error && (
              <div className="text-red-400 ml-4 text-sm">{status.error}</div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <EditKeywordModal
          onClose={handleCloseModal}
          modalState={modalState}
          source={activeSource}
          onSave={handleSaveModal}
        />
      )}
    </main>
  );
}
