import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAffiliate } from "@/lib/affiliate/guard";
import { CLINIC_TYPE_LABEL, STATUS_LABEL, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Klinik Saya — Affiliator" };

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending_approval: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
  suspended: "bg-zinc-100 text-zinc-600",
  rejected: "bg-zinc-100 text-zinc-500",
};

export default async function AffiliateClinicsPage() {
  const ctx = await requireAffiliate();
  const db = createServiceClient();

  const { data: clinics } = await db
    .from("clinics")
    .select("id, name, clinic_type, status, created_at")
    .eq("affiliate_id", ctx.affiliateId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klinik Saya</h1>
          <p className="mt-1 text-sm text-gray-500">Daftar klinik yang Anda bawa beserta status langganannya.</p>
        </div>
        <Link
          href="/affiliate/klinik/tambah"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Tambah Klinik
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        {!clinics || clinics.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            Belum ada klinik. Klik <b>Tambah Klinik</b> untuk mulai.
          </div>
        ) : (
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Tipe</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Ditambahkan</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{CLINIC_TYPE_LABEL[c.clinic_type] ?? c.clinic_type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
