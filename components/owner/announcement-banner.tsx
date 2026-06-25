import { createClient } from "@/lib/supabase/server";

const STYLE: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
};
const ICON: Record<string, string> = { info: "ℹ️", warning: "⚠️", success: "✅" };

// Banner pengumuman platform untuk dashboard owner. Membaca pengumuman aktif
// (RLS: read_active_announcements). Aman bila tabel belum ada (migrasi 0021).
export default async function AnnouncementBanner() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_announcements")
    .select("id, message, level")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {data.map((a) => (
        <div
          key={a.id as string}
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${STYLE[a.level as string] ?? STYLE.info}`}
        >
          <span aria-hidden>{ICON[a.level as string] ?? "ℹ️"}</span>
          <p>{a.message as string}</p>
        </div>
      ))}
    </div>
  );
}
