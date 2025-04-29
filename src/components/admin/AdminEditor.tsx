"use client";
import { useReducer, useEffect, useState } from "react";
import EditKeywordModal from "./EditKeywordModal";
import {
  ConfigData,
  ModalState,
  KeywordItem,
  RedditKeywordItemSchema,
  SteamKeywordItemSchema,
} from "../../lib/types/admin/types";
import { adminStatusReducer } from "../../lib/reducers/admin/adminStatusReducer";
import SourceTabs from "./SourceTabs";
import KeywordSearchBar from "./KeywordSearchBar";
import KeywordChipsGrid from "./KeywordChipsGrid";
import ConfigJsonDisplay from "./ConfigJsonDisplay";
import { REDDIT_DEFAULTS, STEAM_DEFAULTS } from "@/lib/defaults";

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
            const raw =
              typeof data.data[0] === "string"
                ? JSON.parse(data.data[0])
                : data.data[0];
            // Parse the raw data into the expected ConfigData format
            const parsedData: ConfigData = {
              source: {
                reddit: raw.source.reddit || [],
                steam: raw.source.steam || [],
              },
            };
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
        // Clear success message after 3 seconds
        setTimeout(() => {
          dispatchStatus({ type: "RESET" });
        }, 3000);
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
    const updatedData: ConfigData = { ...configData };
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

  function handleSaveModal(savedItemFromModal: KeywordItem) {
    if (!configData || !activeSource) return;
    const updatedData = { ...configData };
    let parsedItem: KeywordItem = savedItemFromModal;
    if (activeSource === "reddit") {
      parsedItem = RedditKeywordItemSchema.parse(savedItemFromModal);
    } else if (activeSource === "steam") {
      parsedItem = SteamKeywordItemSchema.parse(savedItemFromModal);
    }
    if (modalState.open && modalState.index === null) {
      // Add new item to the beginning of the list
      (updatedData.source[activeSource] as KeywordItem[]).unshift(parsedItem);
    } else if (modalState.open && modalState.index !== null) {
      updatedData.source[activeSource][modalState.index] = parsedItem;
    }
    setConfigData(updatedData);
    handleCloseModal();
  }

  if (status.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-white text-lg">Loading config...</div>
      </div>
    );
  }

  const filteredKeywords =
    configData?.source[activeSource].filter(
      (item) =>
        searchTerm.trim() === "" ||
        item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];

  if (!configData) {
    console.error("No config data available");
    return <div className="p-4 text-white">No config data available.</div>;
  }

  const cleanedDataForDisplay = getCleanedConfig(configData);
  const isModalOpen = modalState.open;

  return (
    <main className="min-h-screen w-full flex flex-col bg-gray-900 text-white">
      <div className="flex flex-col items-center p-6 w-full">
        <h1 className="text-3xl font-bold mb-6">Admin Config Editor</h1>

        <div className="bg-gray-800 rounded-lg w-full max-w-5xl">
          <SourceTabs
            sources={sources}
            activeSource={activeSource}
            setActiveSource={setActiveSource}
            setSearchTerm={setSearchTerm}
          />

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

            <KeywordSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />

            <KeywordChipsGrid
              filteredKeywords={filteredKeywords}
              activeSource={activeSource}
              openEditModal={openEditModal}
              handleRemoveKeyword={handleRemoveKeyword}
              searchTerm={searchTerm}
            />

            <div className="mt-4 text-sm text-gray-400">
              {configData.source[activeSource].length} keywords total
              {searchTerm && ` (${filteredKeywords.length} matching)`}
            </div>
          </div>

          <ConfigJsonDisplay
            cleanedDataForDisplay={cleanedDataForDisplay}
          />

          <div className="px-6 pb-6 flex space-x-4 items-center">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
              disabled={status.saving}
            >
              {status.saving ? "Saving..." : "Save Changes"}
            </button>
            {status.error && (
              <div className="text-red-400 ml-4 text-sm">{status.error}</div>
            )}
            {status.success && (
              <div className="text-green-400 ml-4 text-sm">Saved successfully!</div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <EditKeywordModal
          onClose={handleCloseModal}
          item={modalState.item}
          source={activeSource}
          onSave={handleSaveModal}
        />
      )}
    </main>
  );
}

/// Helper function to clean config data for saving/display
function getCleanedConfig(config: ConfigData): Partial<ConfigData> {
  const cleanedOutput: Record<string, Partial<KeywordItem>[]> = {};

  Object.keys(config.source).forEach((sourceKey) => {
    const sourceItems = config.source[sourceKey as keyof typeof config.source];
    cleanedOutput[sourceKey] = sourceItems
      .map((item: KeywordItem) => {
        return cleanObject(item, sourceKey);
      })
      .filter((item): item is Partial<KeywordItem> => item !== null);

    if (cleanedOutput[sourceKey].length === 0) {
      delete cleanedOutput[sourceKey];
    }
  });

  return cleanedOutput;
}

function cleanObject<T extends KeywordItem>(
  obj: T,
  source: string
): Partial<T> {
  if (source !== "reddit" && source !== "steam")
    throw new Error("Invalid source type. Expected 'reddit' or 'steam'.");

  const defaults: Partial<KeywordItem> =
    source === "reddit" ? REDDIT_DEFAULTS : STEAM_DEFAULTS;

  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (key === "isNew" || key === "isEdited" || key === "source") continue;
    const value = obj[key];
    const defaultValue = defaults[key as keyof typeof defaults];
    if (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "string" && value.trim() === "") ||
      value === defaultValue
    ) {
      continue;
    }
    cleaned[key] = value;
  }
  // Always keep keyword
  cleaned.keyword = obj.keyword;
  return cleaned;
}
