-- ============================================================
-- 0022_landing_faqs.sql
-- Tambah kolom FAQ (tanya-jawab) ke landing_page_content agar owner bisa
-- mengisi pertanyaan yang sering diajukan, tampil sebagai accordion di landing.
--
-- AMAN dijalankan kapan saja: additive (add column if not exists), tidak
-- menyentuh data lama. Template membaca via `select('*')` + fallback default,
-- jadi landing tetap jalan sebelum/sesudah migrasi ini. Jalankan SETELAH 0006.
-- ============================================================

alter table landing_page_content
  add column if not exists faqs jsonb default '[]'::jsonb;  -- [{ "q": "...", "a": "..." }]
