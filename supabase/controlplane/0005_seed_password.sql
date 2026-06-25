-- ============================================================
-- controlplane/0005_seed_password.sql — Fase 2B: surface password owner.
-- ⚠️ JALANKAN DI PROJECT SUPABASE CONTROL-PLANE.
--
-- Di alur otomatis, password awal akun owner digenerate saat trigger lalu dipakai
-- runner untuk seed. Simpan di job agar: (a) config yang diambil runner memakai
-- password yang SAMA dengan yang ditampilkan ke super admin, dan (b) super admin
-- bisa melihatnya. Password awal/sementara — owner ganti sendiri setelah login.
-- AMAN diulang.
-- ============================================================

alter table selfhosted_deploy_jobs
  add column if not exists seed_password text;
