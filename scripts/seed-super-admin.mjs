// ============================================================
// Seed super admin pertama (CLAUDE.md §9.2).
// Super admin TIDAK lewat UI signup — dibuat sekali via script ini.
//
// Cara jalan (Node 24+ mendukung --env-file):
//   node --env-file=.env.local scripts/seed-super-admin.mjs
//
// Butuh di .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD, SEED_SUPERADMIN_NAME
// ============================================================
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_SUPERADMIN_EMAIL;
const password = process.env.SEED_SUPERADMIN_PASSWORD;
const fullName = process.env.SEED_SUPERADMIN_NAME || "Super Admin";

if (!url || !serviceKey || !email || !password) {
  console.error(
    "❌ Env belum lengkap. Butuh NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) Buat akun di auth.users. Trigger handle_new_auth_user akan otomatis
//    membuat baris public.users dari user_metadata (role = super_admin).
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, role: "super_admin" },
});

if (error) {
  // Jika user sudah ada, lanjut pastikan role-nya benar.
  if (!/already.*registered|exists/i.test(error.message)) {
    console.error("❌ Gagal membuat auth user:", error.message);
    process.exit(1);
  }
  console.warn("⚠️  Auth user sudah ada, melanjutkan memastikan role...");
}

const userId = data?.user?.id;

// 2) Pastikan baris public.users punya role super_admin & clinic_id null.
//    (idempotent — aman dijalankan ulang)
if (userId) {
  const { error: upErr } = await supabase
    .from("users")
    .update({ role: "super_admin", clinic_id: null, status: "active", full_name: fullName })
    .eq("id", userId);
  if (upErr) {
    console.error("❌ Gagal set role super_admin di public.users:", upErr.message);
    process.exit(1);
  }
}

console.log(`✅ Super admin siap: ${email}`);
console.log("   Login pakai email & password di atas setelah dashboard /admin dibuat (Stage 2).");
