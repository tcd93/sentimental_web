"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/admin");
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
        setIsLoading(false);
      }
    } catch (fetchError) {
      console.error("Login fetch error:", fetchError);
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 text-white p-8 rounded shadow-xl w-80"
      >
        <h1 className="text-xl font-bold mb-4 text-center">Admin Login</h1>
        <input
          className="w-full mb-2 p-2 border border-gray-600 bg-gray-700 rounded text-white placeholder-gray-400"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full mb-4 p-2 border border-gray-600 bg-gray-700 rounded text-white placeholder-gray-400"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="text-red-400 mb-4 text-sm">{error}</div>}
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
