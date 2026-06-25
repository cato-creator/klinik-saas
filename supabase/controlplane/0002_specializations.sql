-- ============================================================
-- controlplane/0002_specializations.sql
-- ------------------------------------------------------------
-- ⚠️ JALANKAN DI PROJECT SUPABASE CONTROL-PLANE (ref vpsdrtkqjlnxqqtiaxek),
--    BUKAN project membership.
--
-- Klinik self-hosted boleh membuka >1 disiplin (Fisio / OT / Terapi Wicara),
-- sama seperti klinik membership. Tambah kolom array `specializations`.
-- `clinic_type` tetap ada sebagai TIPE UTAMA (disiplin pertama) untuk default
-- template; tidak lagi dibatasi CHECK (validasi di app via lib/disciplines.ts).
-- AMAN diulang (idempoten).
-- ============================================================

-- 1) Tambah kolom array (nullable dulu agar bisa backfill baris lama).
alter table selfhosted_clinics
  add column if not exists specializations text[];

-- 2) Backfill baris lama: specializations = [clinic_type].
update selfhosted_clinics
  set specializations = array[clinic_type]
  where specializations is null;

-- 3) Default + NOT NULL untuk baris baru.
alter table selfhosted_clinics
  alter column specializations set default array['fisioterapi']::text[];
alter table selfhosted_clinics
  alter column specializations set not null;

-- 4) Longgarkan CHECK clinic_type (semula hanya fisioterapi/okupasi_terapi →
--    menolak terapi_wicara). Validasi nilai kini di app.
alter table selfhosted_clinics
  drop constraint if exists selfhosted_clinics_clinic_type_check;
