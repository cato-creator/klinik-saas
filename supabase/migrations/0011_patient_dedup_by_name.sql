-- ============================================================
-- 0011 — Dedup pasien per (klinik + HP + NAMA), bukan per (klinik + HP).
-- ============================================================
-- Konteks: satu nomor HP sering dipakai untuk beberapa pasien (mis. orang tua
-- mendaftarkan beberapa anak di klinik Okupasi Terapi). Aturan lama
-- `unique (clinic_id, phone)` MEMAKSA satu nomor = satu pasien → anak kedua
-- dengan HP sama akan tercampur ke rekam medis anak pertama (berbahaya).
--
-- Aturan baru: nomor sama BOLEH dipakai pasien berbeda ASAL namanya berbeda.
-- Dedup utama tetap di aplikasi (app/api/booking) berdasar
-- (varian nomor HP) + (nama ternormalisasi: lowercase, spasi dirapikan).
-- Index unik di bawah = jaring pengaman DB terhadap balapan (race) supaya tidak
-- ada duplikat PERSIS (klinik + HP + nama yg sama). Pakai lower(btrim(full_name))
-- agar "Budi " dan "budi" dianggap sama, tapi "Budi" vs "Sinta" berbeda.
--
-- Aman dijalankan ulang (idempoten). Tidak mungkin gagal karena data lama:
-- constraint lama menjamin tak ada (clinic_id, phone) ganda, jadi pasti tak ada
-- (clinic_id, phone, nama) ganda.

alter table patients drop constraint if exists patients_clinic_id_phone_key;

create unique index if not exists patients_clinic_phone_name_uniq
  on patients (clinic_id, phone, lower(btrim(full_name)))
  where deleted_at is null;
