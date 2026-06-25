import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah, formatPercent, formatDate } from "@/lib/format";
import ExcelDownloadLink from "@/components/ui/excel-download-link";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Dibayar" },
  { key: "cancelled", label: "Batal" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
};

export default async function KomisiPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSuperAdmin();
  const { status } = await searchParams;
  const active = status && FILTERS.some((f) => f.key === status) ? status : "all";

  const db = createAdminClient();
  let query = db
    .from("affiliate_commissions")
    .select("id, affiliate_id, clinic_id, rate, amount, status, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (active !== "all") query = query.eq("status", active);
  const { data: rows } = await query;

  const list = rows ?? [];
  const affIds = Array.from(new Set(list.map((r) => r.affiliate_id).filter(Boolean))) as string[];
  const clinicIds = Array.from(new Set(list.map((r) => r.clinic_id).filter(Boolean))) as string[];
  const [{ data: affs }, { data: clinics }] = await Promise.all([
    affIds.length ? db.from("affiliates").select("id, full_name").in("id", affIds) : Promise.resolve({ data: [] }),
    clinicIds.length ? db.from("clinics").select("id, name").in("id", clinicIds) : Promise.resolve({ data: [] }),
  ]);
  const affMap = new Map((affs ?? []).map((a) => [a.id, a.full_name as string]));
  const clinicMap = new Map((clinics ?? []).map((c) => [c.id, c.name as string]));

  // Totals dari seluruh komisi (bukan hanya yang difilter) untuk kartu ringkasan.
  const { data: allComm } = await db.from("affiliate_commissions").select("amount, status").limit(5000);
  let totPending = 0, totPaid = 0;
  for (const c of allComm ?? []) {
    if (c.status === "pending") totPending += Number(c.amount ?? 0);
    else if (c.status === "paid") totPaid += Number(c.amount ?? 0);
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Laporan Komisi Affiliator</h1>
        <ExcelDownloadLink
          href="/api/admin/komisi/export"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          ⬇ Export Excel
        </ExcelDownloadLink>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Semua komisi lintas affiliator. Tandai dibayar dari <Link href="/admin/affiliates" className="text-emerald-600 hover:underline">detail affiliator</Link>.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="text-xs text-zinc-500">Komisi pending</div>
          <div className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-400">{formatRupiah(totPending)}</div>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="text-xs text-zinc-500">Sudah dibayar</div>
          <div className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(totPaid)}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/affiliates/komisi" : `/admin/affiliates/komisi?status=${f.key}`}
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
        {list.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">Belum ada komisi.</div>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Affiliator</th>
                <th className="px-4 py-3 font-medium">Klinik</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id as string} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                  <td className="px-4 py-3 text-zinc-500">{formatDate(r.created_at as string)}</td>
                  <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">{affMap.get(r.affiliate_id as string) ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{clinicMap.get(r.clinic_id as string) ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">{formatPercent(r.rate as number)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatRupiah(r.amount as number)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status as string] ?? STATUS_BADGE.cancelled}`}>
                      {r.status as string}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
