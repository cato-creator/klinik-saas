// Agregasi data untuk dashboard overview. Dipakai client (browser supabase)
// untuk initial load DAN refetch saat ada event Realtime.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Overview = {
  counts: {
    active: number;
    pending: number;
    expired: number;
    suspended: number;
    rejected: number;
    total: number;
  };
  byType: { fisioterapi: number; okupasi_terapi: number };
  revenueThisMonth: number;
  expiringSoon: number;
  monthly: { label: string; revenue: number; newClinics: number }[];
};

const MONTH_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export async function fetchOverview(supabase: SupabaseClient): Promise<Overview> {
  const [clinicsRes, subsRes] = await Promise.all([
    supabase.from("clinics").select("id,status,clinic_type,created_at"),
    supabase.from("subscriptions").select("amount,started_at,expires_at,status"),
  ]);

  const clinics = clinicsRes.data ?? [];
  const subs = subsRes.data ?? [];

  const counts = {
    active: 0, pending: 0, expired: 0, suspended: 0, rejected: 0, total: clinics.length,
  };
  const byType = { fisioterapi: 0, okupasi_terapi: 0 };

  for (const c of clinics) {
    if (c.status === "active") counts.active++;
    else if (c.status === "pending_approval") counts.pending++;
    else if (c.status === "expired") counts.expired++;
    else if (c.status === "suspended") counts.suspended++;
    else if (c.status === "rejected") counts.rejected++;
    if (c.clinic_type === "fisioterapi") byType.fisioterapi++;
    else if (c.clinic_type === "okupasi_terapi") byType.okupasi_terapi++;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let revenueThisMonth = 0;
  let expiringSoon = 0;
  for (const s of subs) {
    const started = s.started_at ? new Date(s.started_at) : null;
    if (started && started >= monthStart) revenueThisMonth += Number(s.amount ?? 0);
    if (s.status === "active" && s.expires_at) {
      const exp = new Date(s.expires_at);
      if (exp >= now && exp <= in7days) expiringSoon++;
    }
  }

  // 6 bulan terakhir
  const monthly: Overview["monthly"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    let revenue = 0;
    let newClinics = 0;
    for (const s of subs) {
      if (s.started_at) {
        const t = new Date(s.started_at);
        if (t >= d && t < next) revenue += Number(s.amount ?? 0);
      }
    }
    for (const c of clinics) {
      if (c.created_at) {
        const t = new Date(c.created_at);
        if (t >= d && t < next) newClinics++;
      }
    }
    monthly.push({ label: MONTH_ID[d.getMonth()], revenue, newClinics });
  }

  return { counts, byType, revenueThisMonth, expiringSoon, monthly };
}
