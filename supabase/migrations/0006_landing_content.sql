-- ============================================================
-- 0006_landing_content.sql
-- Perkaya landing_page_content agar landing page per klinik bisa LENGKAP &
-- sepenuhnya diatur owner: hero, sejarah/riwayat, visi-misi, statistik,
-- keunggulan, milestone, testimoni, galeri, kontak & sosmed.
--
-- AMAN dijalankan kapan saja: semua additive (add column if not exists),
-- tidak menyentuh data lama. Kode membaca landing_page_content via `select('*')`
-- + fallback default, jadi landing tetap jalan sebelum/ sesudah migrasi ini.
-- Jalankan SETELAH 0005.
-- ============================================================

alter table landing_page_content
  add column if not exists tagline       text,
  add column if not exists hero_image_url text,
  add column if not exists about_image_url text,
  add column if not exists history       text,                  -- narasi sejarah/perjalanan klinik
  add column if not exists founded_year  integer,
  add column if not exists vision        text,                  -- visi
  add column if not exists mission       text,                  -- misi
  add column if not exists stats         jsonb default '[]'::jsonb, -- [{ "value": "500+", "label": "Pasien Ditangani" }]
  add column if not exists features      jsonb default '[]'::jsonb, -- [{ "title": "...", "description": "..." }]
  add column if not exists milestones    jsonb default '[]'::jsonb, -- [{ "year": "2018", "title": "...", "description": "..." }]
  add column if not exists testimonials  jsonb default '[]'::jsonb, -- [{ "name": "...", "role": "...", "text": "..." }]
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists maps_url      text,
  add column if not exists instagram     text;

-- Catatan: kolom lama tetap dipakai —
--   hero_title, hero_subtitle, about_text, gallery_urls[], contact_whatsapp.
-- Nama, alamat, no. telp, deskripsi, logo, jam operasional diambil dari tabel
-- `clinics` (juga editable owner via /owner/landing).
