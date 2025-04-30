import Link from "next/link";
import { DashboardContent } from "@/components/DashboardContent";

export default function Home() {
  return (
    <main className="w-full min-h-screen flex flex-col gap-y-6 items-center justify-start px-2 sm:px-4 md:px-6 lg:px-12 bg-gray-900 text-white">
      <Link
        href="/admin/login"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 absolute top-4 right-4 z-10"
        style={{ position: "absolute", top: 16, right: 16 }}
      >
        Admin Login
      </Link>
      <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">
        Game Sentiment Dashboard
      </h1>
      {/* Wrap the content that needs context with the provider */}
      <DashboardContent />
    </main>
  );
}
