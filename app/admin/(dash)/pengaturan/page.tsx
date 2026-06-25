import { requireSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import PlanPricesForm from "./plan-prices-form";
import AnnouncementsManager, { type Announcement } from "./announcements-manager";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  await requireSuperAdmin();
  const db = createAdminClient();

  const [pricesRes, annRes] = await Promise.all([
    db.from("plan_prices").select("plan_type, price"),
    db.from("platform_announcements").select("id, message, level, is_active, created_at").order("created_at", { ascending: false }),
  ]);

  // Deteksi migrasi 0021 belum dijalankan.
  const missing =
    /relation .* does not exist|could not find the table|schema cache/i.test(pricesRes.error?.message ?? "") ||
    /relation .* does not exist|could not find the table|schema cache/i.test(annRes.error?.message ?? "");

  const prices: Record<string, number> = {};
  for (const p of pricesRes.data ?? []) prices[p.plan_type as string] = Number(p.price ?? 0);
  const announcements = (annRes.data ?? []) as Announcement[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Pengaturan Platform</h1>
      <p className="mb-5 text-sm text-zinc-500">Harga acuan langganan & pengumuman ke semua klinik.</p>

      {missing && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Tabel pengaturan belum ada. Jalankan migrasi <code className="font-mono">0021_platform_config.sql</code> di Supabase dulu, lalu muat ulang halaman ini.
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Harga acuan plan</h2>
        <PlanPricesForm prices={prices} />
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Pengumuman ke dashboard owner</h2>
        <AnnouncementsManager items={announcements} />
      </section>
    </div>
  );
}
