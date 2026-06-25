import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, CLINIC_TYPE_LABEL, formatDate } from "@/lib/format";
import StatusBadge from "../status-badge";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "pending_approval", label: "Pending" },
  { key: "active", label: "Aktif" },
  { key: "expired", label: "Expired" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Ditolak" },
];

export default async function ClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = status && FILTERS.some((f) => f.key === status) ? status : "all";

  const supabase = await createClient();
  let query = supabase
    .from("clinics")
    .select("id,name,subdomain,clinic_type,status,created_at")
    .order("created_at", { ascending: false });
  if (active !== "all") query = query.eq("status", active);

  const { data: clinics } = await query;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Klinik</h1>
        <Link
          href="/admin/clinics/new"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Tambah Klinik
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/clinics" : `/admin/clinics?status=${f.key}`}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              active === f.key
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {!clinics || clinics.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">
            Belum ada klinik{active !== "all" ? ` dengan status ${STATUS_LABEL[active] ?? active}` : ""}.
          </div>
        ) : (
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Tipe</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Subdomain</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Daftar</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/clinics/${c.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {CLINIC_TYPE_LABEL[c.clinic_type] ?? c.clinic_type}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                    {c.subdomain?.startsWith("pending-") ? <span className="text-zinc-400">—</span> : c.subdomain}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
