-- ============================================================
-- 0007_affiliate_self_read.sql
-- Stage 9 (Affiliator) — perbaikan RLS.
--
-- MASALAH: akun affiliator (role 'affiliate') punya clinic_id = NULL, sehingga
-- TIDAK ada policy SELECT pada tabel `users` yang cocok untuk membaca baris
-- profilnya sendiri:
--   - tenant_read_own_clinic_users  → clinic_id = auth_user_clinic_id() (NULL = NULL → NULL, gagal)
--   - super_admin_full_access_users → hanya super admin
-- Akibatnya halaman login (yang membaca `role` lewat anon client) & guard
-- /affiliate gagal mengenali role → affiliator tidak bisa masuk dashboardnya.
--
-- SOLUSI: izinkan SETIAP user membaca BARIS-NYA SENDIRI (id = auth.uid()).
-- Aman & higienis untuk semua role (tidak membuka baris user lain). Tidak ada
-- rekursi karena tidak memanggil auth_user_role()/auth_user_clinic_id().
--
-- AMAN dijalankan kapan saja (idempoten via drop-if-exists). Jalankan SETELAH 0006.
-- ============================================================

drop policy if exists "user_read_self" on users;
create policy "user_read_self" on users
  for select using (id = (select auth.uid()));
