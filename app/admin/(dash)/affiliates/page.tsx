import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Affiliator — Super Admin" };

type AffiliateRow = {
  id: string;
  full_name: string;
  email: string | null;
  commission_rate: number;
  status: string;
};

export default async function AffiliatesPage() {
  const supabase = await createClient();

  const [{ data: affiliates }, { data: clinics }, { data: commissions }] = await Promise.all([
    supabase
      .from("affiliates")
      .select("id, full_name, email, commission_rate, status")
      .order("created_at", { ascending: false }),
    supabase.from("clinics").select("affiliate_id").not("affiliate_id", "is", null),
    supabase.from("affiliate_commissions").select("affiliate_id, amount, status"),
  ]);

  // Agregasi per-affiliator (jumlah klinik & komisi pending) di memori — data kecil.
  const clinicCount = new Map<string, number>();
  for (const c of clinics ?? []) {
    const k = c.affiliate_id as string;
    clinicCount.set(k, (clinicCount.get(k) ?? 0) + 1);
  }
  const pendingByAff = new Map<string, number>();
  for (const c of commissions ?? []) {
    if (c.status !== "pending") continue;
    const k = c.affiliate_id as string;
    pendingByAff.set(k, (pendingByAff.get(k) ?? 0) + Number(c.amount ?? 0));
  }

  const rows = (affiliates ?? []) as AffiliateRow[];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Affiliator</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/affiliates/komisi"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            📊 Laporan komisi
          </Link>
          <Link
            href="/admin/affiliates/new"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Tambah Affiliator
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">
            Belum ada affiliator. Tambahkan untuk mulai program profit sharing.
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
                <th className="px-4 py-3 font-medium">Komisi</th>
                <th className="px-4 py-3 font-medium">Klinik</th>
                <th className="px-4 py-3 font-medium">Komisi pending</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/affiliates/${a.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                      {a.full_name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">{a.email ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatPercent(a.commission_rate)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{clinicCount.get(a.id) ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatRupiah(pendingByAff.get(a.id) ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        a.status === "active"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800"
                      }
                    >
                      {a.status === "active" ? "Aktif" : "Nonaktif"}
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
