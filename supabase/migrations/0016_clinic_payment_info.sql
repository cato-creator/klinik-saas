-- ============================================================
-- 0016_clinic_payment_info.sql
--   Info rekening pembayaran komitmen fee booking online (per klinik),
--   diisi owner di /owner/pengaturan. Ditampilkan ke pasien saat booking
--   (bisa di-copy) agar pasien bisa transfer & kirim bukti via WhatsApp.
-- ============================================================

alter table clinics
  add column if not exists payment_bank text,            -- nama bank / e-wallet, mis. "BCA"
  add column if not exists payment_account_name text,     -- nama pemilik rekening
  add column if not exists payment_account_number text;   -- nomor rekening / no. e-wallet
