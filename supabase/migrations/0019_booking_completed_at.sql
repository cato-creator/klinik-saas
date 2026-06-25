-- ============================================================
-- 0019_booking_completed_at.sql
--   Catat WAKTU pelayanan diselesaikan (saat terapis/admin klik
--   "Selesai Pelayanan"). Dipakai di banner rekam medis untuk
--   menampilkan "Selesai Pelayanan Poli: <tgl>, <jam> WIB" pada
--   kunjungan yang sudah selesai (mode histori).
--   Booking lama yang sudah 'completed' sebelum kolom ini ada akan
--   bernilai null → UI fallback ke tanggal/jam kunjungan (session).
-- ============================================================

alter table bookings
  add column if not exists completed_at timestamptz;
