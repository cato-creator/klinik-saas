import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPercent, formatRupiah, formatDate } from "@/lib/format";
import AffiliateEditForm from "./affiliate-edit-form";
import CommissionActions from "./commission-actions";

export const dynamic = "force-dynamic";

export default async function AffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!affiliate) notFound();

  const [{ data: clinics }, { data: commissions }] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, status, subdomain")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_commissions")
      .select("id, amount, rate, status, created_at, paid_at, clinic_id")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const clinicName = new Map((clinics ?? []).map((c) => [c.id, c.name]));

  const totalPending = (commissions ?? [])
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const totalPaid = (commissions ?? [])
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/affiliates" className="text-sm text-zinc-500 hover:underline">
        ← Kembali ke daftar affiliator
      </Link>

      <div className="mb-6 mt-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{affiliate.full_name}</h1>
        <span
          className={
            affiliate.status === "active"
              ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800"
          }
        >
          {affiliate.status === "active" ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      {/* Ringkasan komisi */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Komisi" value={formatPercent(affiliate.commission_rate)} />
        <SummaryCard label="Komisi pending" value={formatRupiah(totalPending)} accent="amber" />
        <SummaryCard label="Komisi dibayar" value={formatRupiah(totalPaid)} accent="emerald" />
      </div>

      {/* Form edit */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Data Affiliator</h2>
        <AffiliateEditForm
          affiliate={{
            id: affiliate.id,
            full_name: affiliate.full_name,
            email: affiliate.email,
            phone_number: affiliate.phone_number,
            payout_info: affiliate.payout_info,
            commission_rate: Number(affiliate.commission_rate ?? 0),
            status: affiliate.status,
          }}
        />
      </div>

      {/* Klinik yang dibawa */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Klinik yang dibawa ({clinics?.length ?? 0})
        </h2>
        {!clinics || clinics.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada klinik dari affiliator ini.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {clinics.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/clinics/${c.id}`} className="font-medium text-zinc-800 hover:underline dark:text-zinc-200">
                  {c.name}
                </Link>
                <span className="text-xs text-zinc-500">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Riwayat komisi */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Riwayat Komisi</h2>
        {!commissions || commissions.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada komisi. Komisi tercatat saat klinik approve / perpanjang langganan.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="px-3 py-2 font-medium">Tanggal</th>
                  <th className="px-3 py-2 font-medium">Klinik</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Komisi</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="px-3 py-2 text-zinc-500">{formatDate(c.created_at)}</td>
                    <td className="px-3 py-2">{clinicName.get(c.clinic_id) ?? "—"}</td>
                    <td className="px-3 py-2 text-zinc-500">{formatPercent(c.rate)}</td>
                    <td className="px-3 py-2 font-medium">{formatRupiah(c.amount)}</td>
                    <td className="px-3 py-2">
                      <CommissionStatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-2">
                      <CommissionActions commissionId={c.id} status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "amber" | "emerald" }) {
  const color =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function CommissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
  };
  const label: Record<string, string> = { pending: "Pending", paid: "Dibayar", cancelled: "Batal" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.cancelled}`}>
      {label[status] ?? status}
    </span>
  );
}
