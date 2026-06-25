import Link from "next/link";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBilling, type BillingRow } from "@/lib/admin/billing";
import { formatRupiah, formatRupiahShort, PLAN_LABEL, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LanggananPage() {
  await requireSuperAdmin();
  const db = createAdminClient();
  const b = await fetchBilling(db);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Langganan</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Pantau masa aktif tiap klinik, perpanjang sebelum kedaluwarsa, dan lihat pendapatan langganan.
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="MRR (perkiraan)" value={formatRupiah(b.mrr)} sub="pendapatan langganan / bulan" tone="emerald" />
        <Stat label="Nilai langganan aktif" value={formatRupiahShort(b.activeValue)} sub={`${b.activeCount} klinik aktif`} tone="blue" />
        <Stat label="Akan berakhir ≤30 hari" value={b.expiringSoon} sub="perlu ditindak" tone="amber" />
        <Stat label="Expired (churn)" value={b.expiredCount} sub="belum diperpanjang" tone="red" />
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Status langganan semua klinik</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Urut dari yang paling mendesak.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Klinik</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 text-right font-medium">Harga</th>
                <th className="px-4 py-3 font-medium">Berakhir</th>
                <th className="px-4 py-3 font-medium">Sisa</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {b.rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Belum ada klinik berlangganan.</td></tr>
              ) : b.rows.map((r) => <Row key={r.clinicId} r={r} />)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({ r }: { r: BillingRow }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40">
      <td className="px-4 py-3">
        <Link href={`/admin/clinics/${r.clinicId}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
          {r.name}
        </Link>
        <div className="text-xs text-zinc-400">{r.status}</div>
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.plan ? (PLAN_LABEL[r.plan] ?? r.plan) : "—"}</td>
      <td className="px-4 py-3 text-right tabular-nums">{r.amount ? formatRupiahShort(r.amount) : "—"}</td>
      <td className="px-4 py-3 text-zinc-500">{r.expiresAt ? formatDate(r.expiresAt) : "—"}</td>
      <td className="px-4 py-3"><DaysBadge days={r.daysLeft} status={r.status} /></td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/clinics/${r.clinicId}`}
          className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          Perpanjang
        </Link>
      </td>
    </tr>
  );
}

function DaysBadge({ days, status }: { days: number | null; status: string }) {
  if (status === "expired" || (days !== null && days < 0)) {
    return <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">Expired</span>;
  }
  if (days === null) return <span className="text-xs text-zinc-400">—</span>;
  const tone = days <= 7 ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    : days <= 30 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>{days} hari</span>;
}

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}
