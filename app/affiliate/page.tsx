import Link from "next/link";
import { Building2, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAffiliate } from "@/lib/affiliate/guard";
import { formatRupiah, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AffiliateDashboard() {
  const ctx = await requireAffiliate();
  const db = createServiceClient();

  const [clinicsRes, commissionsRes] = await Promise.all([
    db.from("clinics").select("id, status").eq("affiliate_id", ctx.affiliateId),
    db.from("affiliate_commissions").select("amount, status").eq("affiliate_id", ctx.affiliateId),
  ]);

  const clinics = clinicsRes.data ?? [];
  const commissions = commissionsRes.data ?? [];

  const activeClinics = clinics.filter((c) => c.status === "active").length;
  const pending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const paid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Halo, {ctx.fullName} 👋</h1>
          <p className="mt-1 text-sm text-gray-500">
            Komisi Anda <b>{formatPercent(ctx.commissionRate)}</b> dari langganan setiap klinik yang Anda bawa.
          </p>
        </div>
        <Link
          href="/affiliate/klinik/tambah"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Tambah Klinik
        </Link>
      </div>

      {ctx.status !== "active" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Akun affiliator Anda sedang <b>nonaktif</b>. Anda masih bisa melihat data, tetapi komisi
          baru tidak dihitung. Hubungi admin platform.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} label="Total Klinik" value={String(clinics.length)} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Klinik Aktif" value={String(activeClinics)} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Komisi Pending" value={formatRupiah(pending)} accent="amber" />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Komisi Dibayar" value={formatRupiah(paid)} accent="emerald" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Cara kerja</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
          <li>Tambah klinik beserta data owner lewat menu <b>Tambah Klinik</b>.</li>
          <li>Klinik masuk antrian <b>menunggu approval</b> super admin platform.</li>
          <li>Setelah disetujui &amp; berlangganan, komisi Anda otomatis tercatat (juga setiap perpanjangan).</li>
          <li>Komisi dibayar manual oleh admin platform, lalu ditandai <b>dibayar</b> di menu Komisi.</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "amber" | "emerald";
}) {
  const color =
    accent === "amber" ? "text-amber-600" : accent === "emerald" ? "text-emerald-600" : "text-indigo-600";
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 ${color}`}>
        {icon}
      </span>
      <div className="mt-3 text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
