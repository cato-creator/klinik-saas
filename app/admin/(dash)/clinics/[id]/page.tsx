import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_LABEL, PLAN_LABEL, formatDate, formatRupiah, formatRupiahShort,
} from "@/lib/format";
import { EXCLUDE_LABA } from "@/lib/keuangan";
import { disciplineLabel } from "@/lib/disciplines";
import StatusBadge from "../../status-badge";
import ApproveForm from "./approve-form";
import SubscriptionManager from "./subscription-manager";
import ClinicStatusActions from "./clinic-status-actions";
import AffiliateAssign from "./affiliate-assign";
import ClinicExports from "@/components/admin/clinic-exports";
import ClinicStaff, { type StaffMember } from "@/components/admin/clinic-staff";
import ImpersonateButton from "@/components/admin/impersonate-button";
import { slugify } from "./slugify";

const NON_EXPENSE = new Set([...EXCLUDE_LABA, "Prive"]);

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: clinic }, { data: owner }, { data: subs }, { data: affiliates }] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", id).single(),
    supabase.from("users").select("full_name,email,phone_number,status")
      .eq("clinic_id", id).eq("role", "owner").maybeSingle(),
    supabase.from("subscriptions").select("*").eq("clinic_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("affiliates").select("id, full_name").order("full_name", { ascending: true }),
  ]);

  if (!clinic) notFound();

  const isPending = clinic.status === "pending_approval";
  const showSubdomain = clinic.subdomain && !clinic.subdomain.startsWith("pending-");
  const hasData = ["active", "expired", "suspended"].includes(clinic.status);

  // Daftar staf klinik (owner/admin/terapis) untuk kelola akun.
  const { data: staffRows } = await supabase
    .from("users")
    .select("id, full_name, role, email, status")
    .eq("clinic_id", id)
    .in("role", ["owner", "admin", "therapist"])
    .order("role", { ascending: true });
  const staff: StaffMember[] = (staffRows ?? []).map((u) => ({
    id: u.id as string,
    full_name: (u.full_name as string) ?? "(tanpa nama)",
    role: u.role as string,
    email: (u.email as string) ?? null,
    status: (u.status as string) ?? "active",
  }));

  // Harga acuan plan (untuk prefill approve / perpanjang). Aman bila migrasi 0021
  // belum dijalankan (prices kosong → form pakai 0).
  const { data: priceRows } = await supabase.from("plan_prices").select("plan_type, price");
  const planPrices: Record<string, number> = {};
  for (const p of priceRows ?? []) planPrices[p.plan_type as string] = Number(p.price ?? 0);

  // Ringkasan data klinik (read-only) untuk panel "intip" super admin.
  let summary: {
    patients: number;
    visits: number;
    income: number;
    expense: number;
    recentBookings: { code: string; patient: string; date: string; status: string }[];
    recentPatients: { rm: string; name: string; phone: string }[];
  } | null = null;

  if (hasData) {
    const [{ count: patientCount }, { count: visitCount }, { data: keu }, { data: recentB }, { data: recentP }] =
      await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true })
          .eq("clinic_id", id).is("deleted_at", null),
        supabase.from("bookings").select("id", { count: "exact", head: true })
          .eq("clinic_id", id).in("status", ["confirmed", "in_progress", "completed"]),
        supabase.from("keuangan").select("jenis,akun,jumlah").eq("clinic_id", id),
        supabase.from("bookings")
          .select("booking_code,session_date,status,patient:patients(full_name)")
          .eq("clinic_id", id).order("session_date", { ascending: false }).limit(8),
        supabase.from("patients")
          .select("medical_record_no,full_name,phone")
          .eq("clinic_id", id).is("deleted_at", null)
          .order("created_at", { ascending: false }).limit(8),
      ]);

    let income = 0, expense = 0;
    for (const k of keu ?? []) {
      const akun = (k.akun as string) ?? "";
      if (EXCLUDE_LABA.includes(akun)) continue;
      const jumlah = Number(k.jumlah ?? 0);
      if (k.jenis === "masuk") income += jumlah;
      else if (k.jenis === "keluar" && !NON_EXPENSE.has(akun)) expense += jumlah;
    }

    summary = {
      patients: patientCount ?? 0,
      visits: visitCount ?? 0,
      income,
      expense,
      recentBookings: (recentB ?? []).map((b) => ({
        code: (b.booking_code as string) ?? "",
        patient: ((b.patient as { full_name?: string } | null)?.full_name) ?? "-",
        date: formatDate(b.session_date as string),
        status: (b.status as string) ?? "",
      })),
      recentPatients: (recentP ?? []).map((p) => ({
        rm: String(p.medical_record_no ?? "").replace(/\D/g, "").padStart(6, "0").replace(/^0+$/, ""),
        name: (p.full_name as string) ?? "",
        phone: (p.phone as string) ?? "",
      })),
    };
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/clinics" className="text-sm text-zinc-500 hover:underline">
        ← Kembali ke daftar
      </Link>

      <div className="mb-6 mt-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{clinic.name}</h1>
        <StatusBadge status={clinic.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard title="Informasi Klinik">
          <Row
            k="Layanan"
            v={
              ((clinic.specializations as string[] | null)?.length
                ? (clinic.specializations as string[])
                : [clinic.clinic_type]
              ).map((s) => disciplineLabel(s)).join(", ")
            }
          />
          <Row k="Subdomain" v={showSubdomain ? `${clinic.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "platformlo.com"}` : "— (belum di-assign)"} />
          <Row k="Alamat" v={clinic.address ?? "-"} />
          <Row k="No. HP" v={clinic.phone_number ?? "-"} />
          <Row k="Daftar" v={formatDate(clinic.created_at)} />
          <Row k="Disetujui" v={clinic.approved_at ? formatDate(clinic.approved_at) : "-"} />
        </InfoCard>

        <InfoCard title="Owner">
          {owner ? (
            <>
              <Row k="Nama" v={owner.full_name} />
              <Row k="Email" v={owner.email ?? "-"} />
              <Row k="No. HP" v={owner.phone_number ?? "-"} />
              <Row k="Status akun" v={STATUS_LABEL[owner.status] ?? owner.status} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Belum ada owner terkait.</p>
          )}
        </InfoCard>
      </div>

      {isPending && (
        <div className="mt-6">
          <ApproveForm
            clinicId={clinic.id}
            specializations={
              (clinic.specializations as string[] | null)?.length
                ? (clinic.specializations as string[])
                : [clinic.clinic_type]
            }
            suggestedSubdomain={slugify(clinic.name)}
            planPrices={planPrices}
          />
        </div>
      )}

      {!isPending && clinic.status !== "rejected" && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Langganan</h2>
          {!subs || subs.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Belum ada langganan.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Harga</th>
                    <th className="px-3 py-2 font-medium">Mulai</th>
                    <th className="px-3 py-2 font-medium">Berakhir</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                      <td className="px-3 py-2">{PLAN_LABEL[s.plan_type] ?? s.plan_type}</td>
                      <td className="px-3 py-2">{formatRupiah(s.amount)}</td>
                      <td className="px-3 py-2 text-zinc-500">{formatDate(s.started_at)}</td>
                      <td className="px-3 py-2 text-zinc-500">{formatDate(s.expires_at)}</td>
                      <td className="px-3 py-2">
                        <span className={s.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <SubscriptionManager clinicId={clinic.id} planPrices={planPrices} />
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Affiliator</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Affiliator yang membawa klinik ini (untuk komisi). Komisi tercatat saat approve / perpanjang langganan.
        </p>
        <AffiliateAssign
          clinicId={clinic.id}
          current={clinic.affiliate_id ?? ""}
          affiliates={affiliates ?? []}
        />
      </div>

      {!isPending && clinic.status !== "rejected" && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Pengguna klinik</h2>
            {owner?.email && <ImpersonateButton clinicId={clinic.id} ownerName={owner.full_name} />}
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Reset password (tampil sekali) atau nonaktifkan akun owner/admin/terapis klinik ini.
          </p>
          <ClinicStaff staff={staff} />
        </div>
      )}

      {summary && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Data klinik (read-only)</h2>
            <ClinicExports clinicId={clinic.id} clinicName={clinic.name} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="Pasien" value={summary.patients.toLocaleString("id-ID")} />
            <MiniStat label="Kunjungan" value={summary.visits.toLocaleString("id-ID")} />
            <MiniStat label="Pemasukan" value={formatRupiahShort(summary.income)} />
            <MiniStat
              label="Laba operasional"
              value={formatRupiahShort(summary.income - summary.expense)}
              tone={summary.income - summary.expense < 0 ? "red" : "default"}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Kunjungan terbaru</h3>
              {summary.recentBookings.length === 0 ? (
                <p className="text-sm text-zinc-500">Belum ada kunjungan.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {summary.recentBookings.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                      <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">{b.patient}</span>
                      <span className="shrink-0 text-xs text-zinc-500">{b.date} · {b.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Pasien terbaru</h3>
              {summary.recentPatients.length === 0 ? (
                <p className="text-sm text-zinc-500">Belum ada pasien.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {summary.recentPatients.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                      <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">{p.name}</span>
                      <span className="shrink-0 text-xs text-zinc-500">{p.rm ? `RM ${p.rm}` : ""} {p.phone}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <ClinicStatusActions clinicId={clinic.id} status={clinic.status} subdomain={clinic.subdomain} />
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</h2>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "red" }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${tone === "red" ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="shrink-0 text-zinc-500">{k}</dt>
      <dd className="text-right text-zinc-800 dark:text-zinc-200">{v}</dd>
    </div>
  );
}
