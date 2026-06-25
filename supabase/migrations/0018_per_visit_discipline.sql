-- ============================================================
-- 0018 — DISIPLIN PER-KUNJUNGAN (booking/asesmen/target)
-- ============================================================
-- Lanjutan 0017. Agar 1 pasien (1 No.RM) bisa memakai >1 layanan (Fisio + OT)
-- dengan riwayat yang RAPI & BERLABEL per layanan, disiplin disimpan di tiap
-- KUNJUNGAN (bookings), ASESMEN (assessments), dan TARGET (treatment_goals) —
-- bukan hanya di pasien. `patients.discipline` (0017) tetap ada sebagai default.
--
-- Backfill aman untuk data lama: ambil dari terapis penangani → disiplin pasien
-- → tipe utama klinik. Khusus asesmen, hormati `data->>'form_type'='okupasi'`.
-- Idempoten.

-- 1) bookings.discipline
alter table bookings add column if not exists discipline text;
update bookings b set discipline = coalesce(
  (select t.discipline from therapists t where t.id = b.therapist_id),
  (select p.discipline from patients p where p.id = b.patient_id),
  (select c.clinic_type from clinics c where c.id = b.clinic_id)
) where b.discipline is null;

-- 2) assessments.discipline
alter table assessments add column if not exists discipline text;
update assessments a set discipline = coalesce(
  case when (a.data->>'form_type') = 'okupasi' then 'okupasi_terapi' end,
  (select t.discipline from therapists t where t.id = a.therapist_id),
  (select p.discipline from patients p where p.id = a.patient_id),
  (select c.clinic_type from clinics c where c.id = a.clinic_id)
) where a.discipline is null;

-- 3) treatment_goals.discipline
alter table treatment_goals add column if not exists discipline text;
update treatment_goals g set discipline = coalesce(
  (select t.discipline from therapists t where t.id = g.therapist_id),
  (select p.discipline from patients p where p.id = g.patient_id),
  (select c.clinic_type from clinics c where c.id = g.clinic_id)
) where g.discipline is null;
