"use client";
import { useEffect, useState } from "react";

export default function AdminEditor() {
  const [json, setJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data[0]) {
          setJson(data.data[0]);
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
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json }),
    });
    if (res.ok) {
      setSuccess(true);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  }

  if (loading) return <div>Loading config...</div>;
  return (
    <div>
      <textarea
        className="w-full h-96 font-mono p-2 border rounded"
        value={json}
        onChange={e => setJson(e.target.value)}
        spellCheck={false}
      />
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save"}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {success && <div className="text-green-600 mt-2">Saved!</div>}
    </div>
  );
}
