-- ============================================================
-- 0022_treatment_cases_homeprogram.sql
--   3 fitur panel terapis (fokus fisioterapi):
--   1) Tindakan/modalitas PER-KUNJUNGAN  -> bookings.modalities (text[])
--      (kartu chip "Tindakan Terapi" di sidebar SOAP, dipilih tiap kunjungan)
--   2) Daftar tindakan CUSTOM permanen per klinik -> tabel clinic_modalities
--      (di luar daftar bawaan; dipakai bersama semua terapis di klinik)
--   3) Gambar Home Program -> session_notes.home_program_images (text[])
--      (URL Cloudinary; ditampilkan di layar saat menjelaskan ke pasien)
--
--   Jalankan SETELAH 0021. AMAN diulang (idempoten).
-- ============================================================

-- 1) Tindakan/modalitas yang dikerjakan pada satu kunjungan.
alter table bookings
  add column if not exists modalities text[] not null default '{}';

-- 3) Gambar panduan latihan rumah (URL Cloudinary).
alter table session_notes
  add column if not exists home_program_images text[] not null default '{}';

-- 2) Daftar tindakan/modalitas custom per KLINIK & per DISIPLIN.
--    Bukan data medis pasien -> boleh hard-delete. Tulis via Route Handler
--    (service role) yang difilter clinic_id sesi; RLS = pengaman lapis kedua.
create table if not exists clinic_modalities (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  discipline  text not null,                 -- 'fisioterapi' | 'okupasi_terapi' | ...
  name        text not null,                 -- nama tindakan, mis. "Dry Needling"
  created_by  uuid references users(id),
  created_at  timestamptz default now(),
  unique (clinic_id, discipline, name)
);

create index if not exists idx_clinic_modalities_clinic_discipline
  on clinic_modalities(clinic_id, discipline);

alter table clinic_modalities enable row level security;

drop policy if exists "tenant_read_clinic_modalities" on clinic_modalities;
create policy "tenant_read_clinic_modalities" on clinic_modalities
  for select using (clinic_id = (select auth_user_clinic_id()));

drop policy if exists "super_admin_all_clinic_modalities" on clinic_modalities;
create policy "super_admin_all_clinic_modalities" on clinic_modalities
  for all using ((select auth_user_role()) = 'super_admin');
