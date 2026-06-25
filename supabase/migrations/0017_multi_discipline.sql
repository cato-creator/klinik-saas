-- ============================================================
-- 0017 — MULTI-DISIPLIN KLINIK (extensible)
-- ============================================================
-- Tujuan: satu klinik bisa membuka lebih dari satu disiplin (mis. Fisioterapi +
-- Okupasi Terapi), dan jenis baru (Terapi Wicara, dokter gigi, RO, dll) bisa
-- ditambahkan nanti TANPA migrasi. Karena itu nilai disiplin TIDAK lagi dibatasi
-- CHECK constraint — validasi dipindah ke aplikasi (lib/disciplines.ts).
--
-- AMAN untuk klinik yang sudah jalan: semua kolom baru punya backfill dari
-- `clinic_type` lama, sehingga perilaku klinik lama tidak berubah.
-- Idempoten (boleh dijalankan ulang).

-- 1) Longgarkan clinic_type: buang CHECK agar jenis baru bisa masuk.
--    `clinic_type` tetap dipakai sebagai TIPE UTAMA (template landing page).
alter table clinics drop constraint if exists clinics_clinic_type_check;

-- 2) Daftar disiplin yang dibuka klinik. Backfill = [clinic_type].
alter table clinics add column if not exists specializations text[] not null default '{}';
update clinics
  set specializations = array[clinic_type]
  where coalesce(array_length(specializations, 1), 0) = 0
    and clinic_type is not null;

-- 3) Disiplin perawatan per-pasien (penentu form anamnesis).
--    NULL = ikut tipe utama klinik (perilaku lama).
alter table patients add column if not exists discipline text;

-- 4) Satu disiplin per terapis. Backfill = clinic_type kliniknya.
alter table therapists add column if not exists discipline text;
update therapists t
  set discipline = c.clinic_type
  from clinics c
  where c.id = t.clinic_id
    and t.discipline is null;

-- 5) View publik: ekspos `specializations` (kolom baru ditambah DI AKHIR agar
--    `create or replace view` tetap valid).
create or replace view public_clinics
with (security_invoker = on) as
  select id, name, subdomain, clinic_type, status, address,
         description, logo_url, operating_hours, specializations
  from clinics
  where status in ('active', 'expired');
