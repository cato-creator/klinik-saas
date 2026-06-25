// Agregasi langganan untuk Billing Center super admin. Memakai service client
// setelah guard. Menghitung MRR (pendapatan langganan dinormalkan ke bulanan),
// nilai langganan aktif, daftar yang akan berakhir, dan churn (expired).
import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingRow = {
  clinicId: string;
  name: string;
  status: string;
  subdomain: string | null;
  plan: string | null;
  amount: number;
  expiresAt: string | null;
  daysLeft: number | null; // negatif = sudah lewat
};

export type Billing = {
  mrr: number;
  activeValue: number;
  activeCount: number;
  expiringSoon: number; // aktif & berakhir ≤30 hari
  expiredCount: number;
  rows: BillingRow[];
};

// Normalkan harga 1 periode ke nilai bulanan.
function toMonthly(plan: string | null, amount: number): number {
  if (plan === "1_year") return amount / 12;
  if (plan === "3_month") return amount / 3;
  return amount; // 1_month / default
}

export async function fetchBilling(db: SupabaseClient): Promise<Billing> {
  const [{ data: clinics }, { data: subs }] = await Promise.all([
    db.from("clinics").select("id, name, status, subdomain").neq("status", "pending_approval"),
    db.from("subscriptions").select("clinic_id, plan_type, amount, expires_at, status").limit(5000),
  ]);

  // Langganan terbaru per klinik (expires_at terbesar).
  const latest = new Map<string, { plan: string | null; amount: number; expires_at: string | null }>();
  for (const s of subs ?? []) {
    const cid = s.clinic_id as string;
    const cur = latest.get(cid);
    const exp = s.expires_at as string | null;
    if (!cur || (exp && (!cur.expires_at || exp > cur.expires_at))) {
      latest.set(cid, { plan: (s.plan_type as string) ?? null, amount: Number(s.amount ?? 0), expires_at: exp });
    }
  }

  const now = Date.now();
  const DAY = 86_400_000;
  const rows: BillingRow[] = [];
  let mrr = 0, activeValue = 0, activeCount = 0, expiringSoon = 0, expiredCount = 0;

  for (const c of clinics ?? []) {
    const sub = latest.get(c.id as string);
    const expiresAt = sub?.expires_at ?? null;
    const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - now) / DAY) : null;

    if (c.status === "active" && sub) {
      mrr += toMonthly(sub.plan, sub.amount);
      activeValue += sub.amount;
      activeCount++;
      if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 30) expiringSoon++;
    }
    if (c.status === "expired") expiredCount++;

    rows.push({
      clinicId: c.id as string,
      name: (c.name as string) ?? "",
      status: (c.status as string) ?? "",
      subdomain: (c.subdomain as string) ?? null,
      plan: sub?.plan ?? null,
      amount: sub?.amount ?? 0,
      expiresAt,
      daysLeft,
    });
  }

  // Urut: yang paling mendesak (daysLeft kecil/expired) di atas; tanpa langganan di bawah.
  rows.sort((a, b) => {
    if (a.daysLeft === null && b.daysLeft === null) return a.name.localeCompare(b.name);
    if (a.daysLeft === null) return 1;
    if (b.daysLeft === null) return -1;
    return a.daysLeft - b.daysLeft;
  });

  return { mrr, activeValue, activeCount, expiringSoon, expiredCount, rows };
}
