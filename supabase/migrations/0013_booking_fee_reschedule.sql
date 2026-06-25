-- ============================================================
-- 0013_booking_fee_reschedule.sql
--   1) Komitmen fee booking online (per klinik) — di-setting owner.
--      Saat pasien booking lewat WEBSITE, booking dibuat dgn amount = fee ini.
--      Setelah dikonfirmasi admin/owner, nominal masuk laporan keuangan
--      (lewat alur payments -> trigger keuangan yang sudah ada).
--   2) Catatan reschedule admin pada bookings (mis. "pasien minta ganti jadwal,
--      sudah dikonfirmasi admin").
-- ============================================================

alter table clinics
  add column if not exists online_booking_fee integer not null default 0
    check (online_booking_fee >= 0);

alter table bookings
  add column if not exists notes_admin text;
