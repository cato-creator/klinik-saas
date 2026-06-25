-- ============================================================
-- 0015_per_clinic_rm.sql — No. Rekam Medis (RM) PER-KLINIK
-- ------------------------------------------------------------
-- MASALAH: RM dibuat dari sequence GLOBAL `patient_rm_seq` + kolom
-- `medical_record_no` unik GLOBAL → klinik baru lanjut nomor platform
-- (mis. klinik baru pertama kali malah dapat RM-000013). Tiap klinik
-- seharusnya mulai dari RM-000001.
--
-- SOLUSI:
--   1. Hapus unik global, ganti unik PER-KLINIK (clinic_id, medical_record_no).
--   2. Renumber ulang RM semua pasien per klinik (urut created_at) → tiap
--      klinik 1,2,3,...  (RM hanya label tampilan; FK pakai patient_id UUID,
--      jadi renumber AMAN — tidak memutus relasi booking/catatan/dll).
--   3. Trigger baru: nomor berikutnya = max(angka RM klinik itu) + 1, di-serialize
--      per klinik via advisory lock agar tidak ada nomor kembar saat bersamaan.
--
-- Idempoten & deterministik (boleh dijalankan ulang; hasil sama).
-- ============================================================

-- 1. Lepas keunikan GLOBAL pada medical_record_no.
alter table patients drop constraint if exists patients_medical_record_no_key;
drop index if exists patients_medical_record_no_key;

-- 2. Renumber RM per klinik (urut waktu dibuat). Sertakan pasien terhapus
--    (soft delete) agar nomornya tidak dipakai ulang oleh pasien baru.
with seq as (
  select id,
         'RM-' || lpad(
           row_number() over (partition by clinic_id order by created_at, id)::text,
           6, '0'
         ) as rm
  from patients
)
update patients p
set    medical_record_no = seq.rm
from   seq
where  seq.id = p.id
  and  p.medical_record_no is distinct from seq.rm;

-- 3. Unik PER-KLINIK (boleh ada RM-000001 di tiap klinik, tapi tak boleh kembar
--    dalam satu klinik).
create unique index if not exists patients_clinic_rm_key
  on patients (clinic_id, medical_record_no);

-- 4. Trigger generator RM per klinik. Advisory lock per clinic_id menyerialkan
--    pemberian nomor sehingga dua insert bersamaan tidak menghasilkan RM kembar.
create or replace function set_medical_record_no()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  next_no int;
begin
  if new.medical_record_no is null then
    perform pg_advisory_xact_lock(hashtext('patient_rm:' || new.clinic_id::text));
    select coalesce(
             max(nullif(regexp_replace(medical_record_no, '\D', '', 'g'), '')::int),
             0
           ) + 1
      into next_no
      from patients
     where clinic_id = new.clinic_id
       and medical_record_no is not null;
    new.medical_record_no := 'RM-' || lpad(next_no::text, 6, '0');
  end if;
  return new;
end;
$$;

-- Pasang ulang trigger (idempoten).
drop trigger if exists patients_set_rm on patients;
create trigger patients_set_rm
  before insert on patients
  for each row execute function set_medical_record_no();

-- Sequence global lama tidak dipakai lagi (biarkan ada agar tak memutus apa pun).
-- ============================================================
-- SELESAI 0015
-- ============================================================
