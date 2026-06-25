// Resolusi konteks tenant dari user yang sedang login.
// Inti adaptasi multi-tenant: dashboard Play Kids dulu single-klinik; di sini
// kita ambil clinic_id dari baris `users` milik user login, lalu semua query
// dashboard difilter ke clinic_id itu.
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROOT_DOMAIN } from "@/lib/tenant/host";

export type TenantRole = "owner" | "admin" | "therapist" | "patient";

export interface TenantContext {
  userId: string;
  clinicId: string;
  role: TenantRole;
  fullName: string;
  email: string | null;
  clinicName: string;
  clinicStatus: string;
  clinicType: string;
}

// URL halaman login tenant (owner/admin/terapis/pasien).
// Sengaja /auth/login (bukan /admin/login yang dipakai super admin).
export const TENANT_LOGIN_PATH = "/auth/login";

// Halaman dashboard default per role (untuk redirect setelah login).
// Catatan: admin TENANT memakai namespace /klinik (bukan /admin yang
// dipakai panel super admin).
export function dashboardPathForRole(role: string): string {
  switch (role) {
    case "owner":
      return "/owner/dashboard";
    case "admin":
      return "/klinik/dashboard";
    case "therapist":
      return "/terapis/dashboard";
    case "patient":
      return "/pasien/dashboard";
    case "super_admin":
      return "/admin";
    case "affiliate":
      return "/affiliate";
    default:
      return "/";
  }
}

type ClinicMini = { name: string; status: string; clinic_type: string; subdomain: string };

// Pemuat konteks tenant — DI-CACHE per request (React cache). Karena
// requireTenantUser dipanggil di LAYOUT dan PAGE sekaligus, tanpa cache setiap
// halaman menjalankan getUser() + query DB DUA KALI (boros & bisa memicu
// "Worker exceeded resource limits"/1102 saat cold start di Cloudflare free).
// Cache + 1 query gabungan (embed klinik) memangkas kerja per-request ~separuh.
// Tidak menerima argumen agar identitas argumen stabil → benar-benar ter-cache.
const loadTenant = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as null | {
    clinic_id: string | null; role: string; full_name: string | null;
    email: string | null; status: string; clinic: ClinicMini | ClinicMini[] | null;
  } };

  const { data: profile } = await supabase
    .from("users")
    // Hint FK `!clinic_id` WAJIB: ada 2 relasi users↔clinics (users.clinic_id &
    // clinics.approved_by) → tanpa hint, embed ambigu & query gagal.
    .select("clinic_id, role, full_name, email, status, clinic:clinics!clinic_id(name, status, clinic_type, subdomain)")
    .eq("id", user.id)
    .single();

  return { user, profile };
});

/**
 * Pastikan user login & punya salah satu role yang diizinkan, lalu kembalikan
 * konteks tenant (termasuk clinic_id & info klinik). Redirect ke login bila
 * tidak memenuhi syarat.
 */
export async function requireTenantUser(
  allowedRoles: TenantRole[],
): Promise<TenantContext> {
  const { user, profile } = await loadTenant();

  if (!user || !profile) redirect(TENANT_LOGIN_PATH);

  // Role tidak sesuai → arahkan ke dashboard yang benar untuk role-nya.
  if (!allowedRoles.includes(profile.role as TenantRole)) {
    redirect(dashboardPathForRole(profile.role));
  }

  if (!profile.clinic_id) {
    // owner/admin/therapist/patient WAJIB punya clinic_id.
    redirect(TENANT_LOGIN_PATH + "?error=no_clinic");
  }

  if (profile.status === "inactive") {
    redirect(TENANT_LOGIN_PATH + "?error=inactive");
  }

  const clinic = (Array.isArray(profile.clinic) ? profile.clinic[0] : profile.clinic) ?? null;

  // Klinik hasil self-signup yang belum di-approve (atau ditolak): jangan tampilkan
  // dashboard yang masih kosong — arahkan ke halaman status.
  if (clinic?.status === "pending_approval" || clinic?.status === "rejected") {
    redirect("/akun/menunggu");
  }

  // Dashboard tenant HANYA boleh diakses di subdomain kliniknya sendiri.
  // Bila diakses dari domain utama (apex) atau subdomain klinik lain, alihkan ke
  // subdomain yang benar. Ini mencegah "dashboard ganda" (mis. owner bisa buka
  // apkfun.eu.org/owner DAN marjiko.apkfun.eu.org/owner). Cookie sesi host-scoped,
  // jadi setelah dialihkan user login sekali di subdomain kliniknya.
  if (ROOT_DOMAIN && clinic?.subdomain && !clinic.subdomain.startsWith("pending-")) {
    const currentSub = (await headers()).get("x-clinic-subdomain");
    if (currentSub !== clinic.subdomain) {
      redirect(`https://${clinic.subdomain}.${ROOT_DOMAIN}${dashboardPathForRole(profile.role)}`);
    }
  }

  return {
    userId: user.id,
    clinicId: profile.clinic_id as string,
    role: profile.role as TenantRole,
    fullName: profile.full_name ?? "Pengguna",
    email: profile.email ?? user.email ?? null,
    clinicName: clinic?.name ?? "Klinik",
    clinicStatus: clinic?.status ?? "active",
    clinicType: clinic?.clinic_type ?? "fisioterapi",
  };
}
