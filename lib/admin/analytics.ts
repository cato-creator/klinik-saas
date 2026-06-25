// Agregasi analitik LINTAS KLINIK untuk super admin. Dipanggil server-side
// (service role) setelah guard requireSuperAdmin. Memisahkan dua jenis "pendapatan":
//  - operasional klinik (buku kas `keuangan`): pemasukan & pengeluaran pasien
//  - langganan ke platform (`subscriptions.amount`): uang klinik bayar ke kita
// Mendukung filter rentang waktu (range) untuk totals/leaderboard/perClinic.
import type { SupabaseClient } from "@supabase/supabase-js";
import { EXCLUDE_LABA } from "@/lib/keuangan";

const MONTH_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const VISIT_STATUS = new Set(["confirmed", "in_progress", "completed"]);
const NON_EXPENSE = new Set([...EXCLUDE_LABA, "Prive"]);

export type RangeKey = "30" | "90" | "year" | "all";
export const RANGE_LABEL: Record<RangeKey, string> = {
  "30": "30 hari terakhir",
  "90": "90 hari terakhir",
  year: "Tahun ini",
  all: "Semua waktu",
};

function rangeStart(key: RangeKey, now: Date): Date | null {
  if (key === "all") return null;
  if (key === "year") return new Date(now.getFullYear(), 0, 1);
  const days = key === "30" ? 30 : 90;
  return new Date(now.getTime() - days * 86_400_000);
}

export type ClinicMetric = {
  id: string;
  name: string;
  status: string;
  type: string;
  visits: number;
  patients: number;
  income: number;
  expense: number;
  profit: number;
  subRevenue: number;
};

export type Analytics = {
  range: { key: RangeKey; label: string };
  totals: {
    clinics: number;
    active: number;
    pending: number;
    visits: number;
    patients: number;
    income: number;
    expense: number;
    profit: number;
    subRevenue: number;
    // pertumbuhan bulan kalender ini vs bulan lalu (persen, null bila tak terdefinisi)
    incomeMoM: number | null;
    subMoM: number | null;
    visitsMoM: number | null;
  };
  perClinic: ClinicMetric[];
  monthly: { label: string; income: number; expense: number; subRevenue: number; visits: number }[];
};

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const size = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += size) {
    const { data } = await build(from, from + size - 1);
    if (data?.length) all.push(...data);
    if (!data || data.length < size) break;
  }
  return all;
}

function growth(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

export async function fetchAnalytics(db: SupabaseClient, rangeKey: RangeKey = "all"): Promise<Analytics> {
  const [clinics, bookings, patients, keuangan, subs] = await Promise.all([
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from("clinics").select("id,name,status,clinic_type").range(f, t)),
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from("bookings").select("clinic_id,status,session_date").range(f, t)),
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from("patients").select("clinic_id,deleted_at").range(f, t)),
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from("keuangan").select("clinic_id,tanggal,jenis,akun,jumlah").range(f, t)),
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from("subscriptions").select("clinic_id,amount,started_at").range(f, t)),
  ]);

  const now = new Date();
  const from = rangeStart(rangeKey, now);
  const inRange = (d: string | null | undefined): boolean => {
    if (!from) return true;
    if (!d) return false;
    return new Date(d).getTime() >= from.getTime();
  };

  const metric = new Map<string, ClinicMetric>();
  for (const c of clinics) {
    metric.set(c.id as string, {
      id: c.id as string,
      name: (c.name as string) ?? "(tanpa nama)",
      status: (c.status as string) ?? "",
      type: (c.clinic_type as string) ?? "",
      visits: 0, patients: 0, income: 0, expense: 0, profit: 0, subRevenue: 0,
    });
  }

  for (const b of bookings) {
    if (!VISIT_STATUS.has(b.status as string)) continue;
    if (!inRange(b.session_date as string)) continue;
    const m = metric.get(b.clinic_id as string);
    if (m) m.visits++;
  }

  // patients = total non-terhapus per klinik (tidak difilter range — ini stok pasien).
  for (const p of patients) {
    if (p.deleted_at) continue;
    const m = metric.get(p.clinic_id as string);
    if (m) m.patients++;
  }

  for (const k of keuangan) {
    const m = metric.get(k.clinic_id as string);
    if (!m) continue;
    const akun = (k.akun as string) ?? "";
    if (EXCLUDE_LABA.includes(akun)) continue;
    if (!inRange(k.tanggal as string)) continue;
    const jumlah = Number(k.jumlah ?? 0);
    if (k.jenis === "masuk") m.income += jumlah;
    else if (k.jenis === "keluar" && !NON_EXPENSE.has(akun)) m.expense += jumlah;
  }

  for (const s of subs) {
    if (!inRange(s.started_at as string)) continue;
    const m = metric.get(s.clinic_id as string);
    if (m) m.subRevenue += Number(s.amount ?? 0);
  }

  const perClinic = Array.from(metric.values());
  for (const m of perClinic) m.profit = m.income - m.expense;

  const totals = {
    clinics: clinics.length,
    active: clinics.filter((c) => c.status === "active").length,
    pending: clinics.filter((c) => c.status === "pending_approval").length,
    visits: perClinic.reduce((s, m) => s + m.visits, 0),
    patients: perClinic.reduce((s, m) => s + m.patients, 0),
    income: perClinic.reduce((s, m) => s + m.income, 0),
    expense: perClinic.reduce((s, m) => s + m.expense, 0),
    profit: 0,
    subRevenue: perClinic.reduce((s, m) => s + m.subRevenue, 0),
    incomeMoM: null as number | null,
    subMoM: null as number | null,
    visitsMoM: null as number | null,
  };
  totals.profit = totals.income - totals.expense;

  // Tren 12 bulan terakhir (selalu, tak terpengaruh range).
  const monthly: Analytics["monthly"] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    let income = 0, expense = 0, subRevenue = 0, visits = 0;
    for (const k of keuangan) {
      const akun = (k.akun as string) ?? "";
      if (EXCLUDE_LABA.includes(akun)) continue;
      const t = k.tanggal ? new Date(k.tanggal as string) : null;
      if (!t || t < d || t >= next) continue;
      const jumlah = Number(k.jumlah ?? 0);
      if (k.jenis === "masuk") income += jumlah;
      else if (k.jenis === "keluar" && !NON_EXPENSE.has(akun)) expense += jumlah;
    }
    for (const s of subs) {
      const t = s.started_at ? new Date(s.started_at as string) : null;
      if (t && t >= d && t < next) subRevenue += Number(s.amount ?? 0);
    }
    for (const b of bookings) {
      if (!VISIT_STATUS.has(b.status as string)) continue;
      const t = b.session_date ? new Date(b.session_date as string) : null;
      if (t && t >= d && t < next) visits++;
    }
    monthly.push({ label: MONTH_ID[d.getMonth()], income, expense, subRevenue, visits });
  }

  // MoM = bulan terakhir vs sebelumnya pada tren.
  if (monthly.length >= 2) {
    const cur = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    totals.incomeMoM = growth(cur.income, prev.income);
    totals.subMoM = growth(cur.subRevenue, prev.subRevenue);
    totals.visitsMoM = growth(cur.visits, prev.visits);
  }

  return { range: { key: rangeKey, label: RANGE_LABEL[rangeKey] }, totals, perClinic, monthly };
}
