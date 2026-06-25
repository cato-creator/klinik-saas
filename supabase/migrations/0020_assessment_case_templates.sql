-- ============================================================
-- 0020_assessment_case_templates.sql
--   Template kasus BUATAN SENDIRI untuk MODE CEPAT asesmen/anamnesis.
--   Jalankan SETELAH 0019.
--
-- Konsep:
--  - Selain kasus bawaan (hard-coded di fisio-cases.ts / okupasi-cases.ts),
--    terapis bisa MENYIMPAN template kasus sendiri dari isian mode cepat.
--  - Template DIBAGI per KLINIK & per DISIPLIN (fisioterapi / okupasi_terapi),
--    jadi semua terapis profesi yang sama di klinik itu bisa memakainya.
--  - `data` = JSONB snapshot field auto-isi (bentuknya sama dgn `case.data`
--    bawaan: keluhan_tags, area_tags, intervensi_tags, kesimpulan_problematik,
--    impairment, modalitas, dst.). Hanya dipakai untuk mengisi form cepat;
--    BUKAN data medis pasien, jadi boleh hard-delete.
--
-- Penulisan/pembacaan dilakukan via Route Handler (service role) yang difilter
-- clinic_id dari sesi. RLS di bawah = pengaman lapis kedua.
--
-- AMAN diulang (idempoten): if not exists / drop-if-exists.
-- ============================================================

create table if not exists assessment_case_templates (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  discipline  text not null,                  -- 'fisioterapi' | 'okupasi_terapi' | ...
  name        text not null,                  -- nama template, mis. "LBP Kronik"
  emoji       text,                           -- ikon opsional
  data        jsonb not null default '{}'::jsonb,  -- field auto-isi mode cepat
  created_by  uuid references users(id),      -- terapis/owner/admin yang membuat
  created_at  timestamptz default now()
);

create index if not exists idx_act_clinic_discipline
  on assessment_case_templates(clinic_id, discipline);

-- ============================================
-- RLS — staf klinik (owner/admin/therapist) boleh BACA template kliniknya;
-- super admin akses penuh. Tulis/hapus lewat service role (Route Handler).
-- ============================================
alter table assessment_case_templates enable row level security;

drop policy if exists "tenant_read_case_templates" on assessment_case_templates;
create policy "tenant_read_case_templates" on assessment_case_templates
  for select using (clinic_id = (select auth_user_clinic_id()));

drop policy if exists "super_admin_all_case_templates" on assessment_case_templates;
create policy "super_admin_all_case_templates" on assessment_case_templates
  for all using ((select auth_user_role()) = 'super_admin');
