import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminEditor from "./AdminEditor";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthed = cookieStore.get("admin_auth")?.value === "1";
  if (!isAuthed) {
    redirect("/admin/login");
  }
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Admin Config Editor</h1>
      <AdminEditor />
    </main>
  );
}
