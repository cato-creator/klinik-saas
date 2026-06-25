// Guard untuk dashboard affiliator (/affiliate). Affiliator = level platform
// (clinic_id null, role 'affiliate'). Diakses di domain utama, login lewat
// /auth/login biasa. Lihat CLAUDE.md §3.6.
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole, TENANT_LOGIN_PATH } from "@/lib/tenant/auth";

export interface AffiliateContext {
  userId: string;
  affiliateId: string;
  fullName: string;
  email: string | null;
  commissionRate: number;
  status: string;
}

// Di-cache per request (dipanggil di layout & page).
const loadAffiliate = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, affiliate: null };

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  // Baris affiliates milik user (RLS: affiliate_read_own_profile).
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, full_name, email, commission_rate, status")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, profile, affiliate };
});

export async function requireAffiliate(): Promise<AffiliateContext> {
  const { user, profile, affiliate } = await loadAffiliate();

  if (!user || !profile) redirect(TENANT_LOGIN_PATH);

  if (profile.role !== "affiliate") {
    // Bukan affiliator → arahkan ke dashboard yang sesuai role-nya.
    redirect(dashboardPathForRole(profile.role));
  }

  if (!affiliate) {
    // Akun affiliate tanpa baris affiliates (anomali) → keluarkan ke login.
    redirect(TENANT_LOGIN_PATH + "?error=no_affiliate");
  }

  return {
    userId: user.id,
    affiliateId: affiliate.id,
    fullName: affiliate.full_name ?? profile.full_name ?? "Affiliator",
    email: affiliate.email ?? profile.email ?? null,
    commissionRate: Number(affiliate.commission_rate ?? 0),
    status: affiliate.status,
  };
}

// Versi untuk Route Handler: kembalikan affiliateId atau null (tanpa redirect).
export async function apiAffiliate(): Promise<
  | { ok: true; userId: string; affiliateId: string; status: string }
  | { ok: false }
> {
  const { user, profile, affiliate } = await loadAffiliate();
  if (!user || !profile || profile.role !== "affiliate" || !affiliate) {
    return { ok: false };
  }
  return { ok: true, userId: user.id, affiliateId: affiliate.id, status: affiliate.status };
}
