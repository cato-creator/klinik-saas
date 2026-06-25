import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { createControlPlaneClient, isControlPlaneMissing } from "@/lib/controlplane/client";
import { formatDate } from "@/lib/format";
import { joinDisciplineLabels } from "@/lib/disciplines";
import type { SelfHostedClinic } from "@/lib/controlplane/self-hosted";
import { ProvBadge, LicenseBadge } from "./badges";

export const dynamic = "force-dynamic";

export default async function SelfHostedListPage() {
  await requireSuperAdmin();

  // Env control-plane belum di-set → tampilkan panduan, bukan crash.
  let envError: string | null = null;
  let rows: SelfHostedClinic[] = [];
  let migrationMissing = false;

  try {
    const db = createControlPlaneClient();
    const { data, error } = await db
      .from("selfhosted_clinics")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (isControlPlaneMissing(error.message)) migrationMissing = true;
      else envError = error.message;
    } else {
      rows = (data ?? []) as SelfHostedClinic[];
    }
  } catch (e) {
    envError = e instanceof Error ? e.message : "Gagal terhubung ke control-plane.";
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Klinik Self-Hosted</h1>
          <p className="text-sm text-zinc-500">
            Klinik bayar sekali dengan Supabase &amp; Cloudflare milik sendiri — kita pegang maintenance.
          </p>
        </div>
        <Link
          href="/admin/self-hosted/new"
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Tambah klinik
        </Link>
      </div>

      {envError && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="font-medium">Control-plane belum siap.</p>
          <p className="mt-1">
            Set env <code className="font-mono">CONTROLPLANE_SUPABASE_URL</code>,{" "}
            <code className="font-mono">CONTROLPLANE_SUPABASE_SERVICE_ROLE_KEY</code>, dan{" "}
            <code className="font-mono">CONTROLPLANE_MASTER_KEY</code> di Worker, lalu deploy ulang.
          </p>
          <p className="mt-1 text-xs opacity-80">Detail: {envError}</p>
        </div>
      )}

      {migrationMissing && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Tabel control-plane belum ada. Jalankan{" "}
          <code className="font-mono">supabase/controlplane/0001_init.sql</code> di project Supabase{" "}
          <strong>control-plane</strong> (bukan project membership), lalu muat ulang.
        </div>
      )}

      {!envError && !migrationMissing && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          Belum ada klinik self-hosted. Klik <strong>+ Tambah klinik</strong> untuk mendaftarkan yang pertama.
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 font-medium">Klinik</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Provisioning</th>
                <th className="px-4 py-3 font-medium">Lisensi</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/self-hosted/${c.id}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                      {c.name}
                    </Link>
                    <div className="text-xs text-zinc-500">{joinDisciplineLabels(c.specializations) || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.target_domain ?? "—"}</td>
                  <td className="px-4 py-3"><ProvBadge status={c.provisioning_status} /></td>
                  <td className="px-4 py-3"><LicenseBadge status={c.license_status} /></td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
