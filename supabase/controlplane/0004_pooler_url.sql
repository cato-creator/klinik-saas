-- ============================================================
-- controlplane/0004_pooler_url.sql — Fase 2B: Session Pooler URL.
-- ⚠️ JALANKAN DI PROJECT SUPABASE CONTROL-PLANE.
--
-- Koneksi DIRECT Supabase (db.<ref>.supabase.co) kini IPv6-only → gagal di
-- jaringan tanpa IPv6 (getaddrinfo ENOTFOUND). Solusinya: Session Pooler (IPv4).
-- Field ini menyimpan connection string Session Pooler dari dashboard Supabase
-- (Project Settings → Database → Connection string → Session pooler), DISIMPAN
-- DENGAN placeholder [YOUR-PASSWORD] — password asli disuntik saat rakit bundle
-- dari secret supabase_db_password, jadi field ini TIDAK berisi rahasia.
-- AMAN diulang.
-- ============================================================

alter table selfhosted_clinics
  add column if not exists supabase_pooler_url text;
