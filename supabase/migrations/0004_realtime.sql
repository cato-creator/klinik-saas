-- ============================================================
-- 0004_realtime.sql  —  Aktifkan Supabase Realtime utk dashboard live
-- Jalankan setelah 0003. Event INSERT/UPDATE/DELETE pada tabel ini akan
-- dikirim ke client super admin (RLS tetap berlaku — super admin lihat semua).
-- ============================================================

alter publication supabase_realtime add table clinics;
alter publication supabase_realtime add table subscriptions;
