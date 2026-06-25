-- ============================================================
-- 0009_stage10_polish.sql  (Stage 10 — Polish & Edge Cases)
-- Retensi data medis (UU PDP / CLAUDE.md §9.1): SEMUA tabel rekam medis
-- harus SOFT-DELETE, tidak boleh hard-delete. patients & session_notes sudah
-- punya kolom deleted_at sejak 0005; di sini kita lengkapi tabel medis sisanya.
-- Jalankan SETELAH 0008_keuangan_diskon.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kolom deleted_at untuk tabel rekam medis yang belum punya
-- ------------------------------------------------------------
alter table assessments      add column if not exists deleted_at timestamptz;
alter table diagnoses        add column if not exists deleted_at timestamptz;
alter table treatments       add column if not exists deleted_at timestamptz;
alter table treatment_goals  add column if not exists deleted_at timestamptz;

-- ------------------------------------------------------------
-- 2. Partial index: hampir semua query rekam medis memfilter
--    `deleted_at is null` (hanya baris aktif). Index parsial menjaga
--    lookup per-pasien tetap cepat tanpa mengindeks baris terhapus.
-- ------------------------------------------------------------
create index if not exists idx_session_notes_active
  on session_notes(patient_id) where deleted_at is null;
create index if not exists idx_assessments_active
  on assessments(patient_id) where deleted_at is null;
create index if not exists idx_treatment_goals_active
  on treatment_goals(patient_id) where deleted_at is null;
create index if not exists idx_patients_active
  on patients(clinic_id) where deleted_at is null;

-- ------------------------------------------------------------
-- 3. Catatan audit log akses medis
--    Tidak ada perubahan skema: tabel audit_logs (0001) sudah cukup.
--    Penulisan audit 'soap.view' / 'soap.update' / 'soap.delete' / dst.
--    dilakukan server-side (service role) lewat lib/audit.ts. METADATA
--    audit TIDAK boleh memuat isi medis (S/O/A/P) — cukup id & flag.
-- ------------------------------------------------------------

-- ============================================================
-- SELESAI 0009
-- ============================================================
