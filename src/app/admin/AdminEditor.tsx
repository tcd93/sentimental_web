"use client";
import { useEffect, useState, useRef } from "react";

interface KeywordItem {
  keyword: string;
  isNew?: boolean;
  isEdited?: boolean;
}

interface ConfigData {
  source: {
    [key: string]: KeywordItem[];
  };
}

export default function AdminEditor() {
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [originalData, setOriginalData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const newKeywordInputRef = useRef<HTMLInputElement>(null);
  const keywordsContainerRef = useRef<HTMLDivElement>(null);

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
                  (item: { keyword: string }) => ({
                    ...item,
                    isNew: false,
                    isEdited: false,
                  })
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
      // Remove the isNew and isEdited flags before sending to the server
      const dataToSave = JSON.parse(JSON.stringify(configData)) as ConfigData;

      if (dataToSave && dataToSave.source) {
        Object.keys(dataToSave.source).forEach((source) => {
          if (dataToSave.source) {
            dataToSave.source[source] = dataToSave.source[source].map(
              ({ keyword }) => ({ keyword })
            );
          }
        });
      }

      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: JSON.stringify(dataToSave) }),
      });

      if (res.ok) {
        setSuccess(true);

        // After a successful save, remove all highlighting by setting isNew and isEdited to false
        if (configData && configData.source) {
          const updatedData = { ...configData };
          Object.keys(updatedData.source).forEach((source) => {
            updatedData.source[source] = updatedData.source[source].map(
              (item) => ({
                ...item,
                isNew: false,
                isEdited: false,
              })
            );
          });

          setConfigData(updatedData);
          setOriginalData(JSON.parse(JSON.stringify(updatedData)));
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Failed to save config");
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
      setNewKeyword("");
    }
  }

  function handleAddKeyword() {
    if (!configData || !activeSource || !newKeyword.trim()) return;

    const updatedData = { ...configData };
    updatedData.source[activeSource].unshift({
      keyword: newKeyword.trim(),
      isNew: true,
      isEdited: false,
    });
    setConfigData(updatedData);
    setNewKeyword("");

    // Focus back on the input for adding another keyword
    if (newKeywordInputRef.current) {
      newKeywordInputRef.current.focus();
    }
  }

  function handleRemoveKeyword(source: string, index: number) {
    if (!configData) return;
    const updatedData = { ...configData };
    updatedData.source[source].splice(index, 1);
    setConfigData(updatedData);
  }

  function handleKeywordChange(source: string, index: number, value: string) {
    if (!configData || !originalData) return;
    const updatedData = { ...configData };
    const currentValue = updatedData.source[source][index].keyword;
    
    // Find the original value if it exists at the same position
    let originalValue: string | undefined;
    if (originalData.source[source] && originalData.source[source][index]) {
      originalValue = originalData.source[source][index].keyword;
    }
    
    // Update the value
    if (currentValue !== value) {
      // Determine if this edit should be marked or unmarked
      const shouldBeMarkedAsEdited = originalValue !== undefined && originalValue !== value;
      
      updatedData.source[source][index] = {
        ...updatedData.source[source][index],
        keyword: value,
        isEdited: shouldBeMarkedAsEdited
      };
      setConfigData(updatedData);
    }
  }

  function handleAddSource() {
    const sourceName = prompt("Enter new source name:");
    if (sourceName && sourceName.trim() && configData) {
      const updatedData = { ...configData };
      if (!updatedData.source) {
        updatedData.source = {};
      }
      updatedData.source[sourceName] = [];
      setConfigData(updatedData);
      setActiveSource(sourceName);
    }
  }

  if (loading) return <div className="p-4 text-white">Loading config...</div>;

  const hasChanges =
    JSON.stringify(configData) !== JSON.stringify(originalData);
  const sources = configData?.source ? Object.keys(configData.source) : [];

  // Filter keywords based on search term
  const filteredKeywords =
    activeSource && configData?.source?.[activeSource]
      ? configData.source[activeSource].filter(
          (item) =>
            searchTerm.trim() === "" ||
            item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : [];

  return (
    <main className="min-h-screen w-full flex flex-col bg-gray-900 text-white">
      <div className="flex flex-col items-center p-6 w-full">
        <h1 className="text-3xl font-bold mb-6">Admin Config Editor</h1>

        <div className="bg-gray-800 rounded-lg w-full max-w-5xl">
          {/* Source Tabs */}
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
                    setNewKeyword("");
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

          {/* Keywords Editor */}
          {activeSource && configData?.source?.[activeSource] && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                  {activeSource} Keywords
                </h2>
              </div>

              {/* Search and Add */}
              <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search keywords..."
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div className="flex md:col-span-2">
                  <input
                    ref={newKeywordInputRef}
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newKeyword.trim()) {
                        handleAddKeyword();
                      }
                    }}
                    placeholder="New keyword..."
                    className="w-full flex-grow p-2 bg-gray-700 border border-gray-600 rounded-l text-white"
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Keywords List */}
              <div
                className="bg-gray-700 rounded-lg max-h-[45vh] overflow-y-auto"
                ref={keywordsContainerRef}
              >
                {filteredKeywords.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2">
                    {filteredKeywords.map(
                      (item: KeywordItem, index: number) => {
                        const originalIndex = configData.source[
                          activeSource
                        ].findIndex((k) => k === item);

                        // Determine border class based on isNew and isEdited flags
                        let borderClass = "";
                        if (item.isNew) {
                          borderClass = "border-2 border-green-500";
                        } else if (item.isEdited) {
                          borderClass = "border-2 border-yellow-500";
                        }

                        return (
                          <div
                            key={index}
                            className={`flex items-center bg-gray-800 p-2 rounded ${borderClass}`}
                          >
                            <input
                              type="text"
                              value={item.keyword}
                              onChange={(e) =>
                                handleKeywordChange(
                                  activeSource,
                                  originalIndex,
                                  e.target.value
                                )
                              }
                              className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded mr-2 text-white"
                            />
                            <button
                              onClick={() =>
                                handleRemoveKeyword(activeSource, originalIndex)
                              }
                              className="p-2 text-red-400 hover:text-red-300"
                              aria-label="Remove keyword"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 italic p-4">
                    {searchTerm
                      ? "No matching keywords found"
                      : "No keywords. Add your first keyword above."}
                  </p>
                )}
              </div>

              <div className="mt-4 text-sm text-gray-400">
                {configData.source[activeSource].length} keywords total
                {searchTerm && ` (${filteredKeywords.length} matching)`}
              </div>
            </div>
          )}

          {/* Raw JSON View */}
          <div className="px-6 pb-6">
            <details className="border border-gray-700 rounded">
              <summary className="p-3 cursor-pointer bg-gray-800 font-medium">
                View Raw JSON
              </summary>
              <pre className="p-3 bg-gray-800 overflow-x-auto text-sm text-gray-300 max-h-60 overflow-y-auto">
                {JSON.stringify(configData, null, 2)}
              </pre>
            </details>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 flex space-x-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded disabled:opacity-50 hover:bg-gray-600"
              onClick={handleRevert}
              disabled={!hasChanges}
            >
              Revert Changes
            </button>

            {error && (
              <div className="text-red-400 ml-4 flex items-center">{error}</div>
            )}
            {success && (
              <div className="text-green-400 ml-4 flex items-center">
                Changes saved successfully!
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
