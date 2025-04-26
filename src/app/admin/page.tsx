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
    <main className="w-full h-full mx-auto">
      <AdminEditor />
    </main>
  );
}
