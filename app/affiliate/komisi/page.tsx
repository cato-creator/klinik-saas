import { createServiceClient } from "@/lib/supabase/server";
import { requireAffiliate } from "@/lib/affiliate/guard";
import { formatRupiah, formatPercent, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Komisi — Affiliator" };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700" },
  paid: { label: "Dibayar", cls: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Batal", cls: "bg-zinc-100 text-zinc-500" },
};

export default async function AffiliateCommissionsPage() {
  const ctx = await requireAffiliate();
  const db = createServiceClient();

  const { data: commissions } = await db
    .from("affiliate_commissions")
    .select("id, amount, rate, status, created_at, paid_at, clinic_id, clinic:clinics(name)")
    .eq("affiliate_id", ctx.affiliateId)
    .order("created_at", { ascending: false });

  const rows = (commissions ?? []).map((c) => {
    const cl = c.clinic as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(cl) ? cl[0]?.name : cl?.name;
    return { ...c, clinicName: name ?? "—" };
  });

  const pending = rows.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const paid = rows.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Komisi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Komisi tercatat saat klinik Anda disetujui &amp; setiap perpanjangan langganan.
          Pembayaran dilakukan manual oleh admin platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total pending</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{formatRupiah(pending)}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total dibayar</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{formatRupiah(paid)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            Belum ada komisi. Tambahkan klinik dan komisi muncul setelah klinik berlangganan.
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Klinik</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Komisi</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const s = STATUS[c.status] ?? STATUS.cancelled;
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.clinicName}</td>
                    <td className="px-4 py-3 text-gray-600">{formatPercent(c.rate)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatRupiah(c.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
