import { requireSuperAdmin } from "@/lib/admin/guard";
import AdminNav from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AdminNav name={admin.full_name} />
      <main className="min-w-0 overflow-x-hidden md:ml-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
