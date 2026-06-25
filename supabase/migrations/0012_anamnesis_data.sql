-- ============================================================
-- 0012_anamnesis_data.sql — Form Anamnesis & Pemeriksaan Fisioterapi terstruktur
-- ------------------------------------------------------------
-- Menyimpan seluruh form anamnesis (SK Fisio) sebagai JSONB di kolom `data`
-- pada tabel `assessments`. Additive & idempoten — kolom lama tetap dipakai
-- untuk kompatibilitas (chief_complaint diisi dari keluhan utama agar ringkasan
-- lama tetap tampil). Tabel di dalam form (anamnesis sistem, gerak dasar,
-- antropometri) disimpan sebagai array objek di dalam JSONB.
-- ============================================================

alter table assessments add column if not exists data jsonb;
