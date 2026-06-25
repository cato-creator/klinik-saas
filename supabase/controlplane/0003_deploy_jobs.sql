-- ============================================================
-- controlplane/0003_deploy_jobs.sql — Fase 2B: token job deploy otomatis.
-- ⚠️ JALANKAN DI PROJECT SUPABASE CONTROL-PLANE (sama seperti 0001/0002).
--
-- Saat super admin memicu "Deploy otomatis", panel membuat satu token
-- berumur pendek dan mengirim pipeline GitLab. Runner (PC kita) memakai token
-- itu untuk: (a) mengambil config terdekripsi, dan (b) melaporkan status tiap
-- langkah ke checklist. Token disimpan sebagai HASH (SHA-256) — bukan plaintext —
-- supaya bocoran DB tidak membocorkan token aktif.
-- AMAN diulang (idempoten).
-- ============================================================

create table if not exists selfhosted_deploy_jobs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references selfhosted_clinics(id) on delete cascade,
  token_hash text not null,                 -- SHA-256 hex dari token (bukan plaintext)
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed')),
  expires_at timestamptz not null,          -- token tak berlaku setelah ini
  created_by uuid,                          -- super admin pemicu
  created_at timestamptz default now()
);

create index if not exists idx_sh_deploy_jobs_clinic on selfhosted_deploy_jobs(clinic_id);
create index if not exists idx_sh_deploy_jobs_token on selfhosted_deploy_jobs(token_hash);

-- RLS dikunci total (tanpa policy) — sama seperti tabel control-plane lain.
-- Hanya service role (panel) yang mengakses.
alter table selfhosted_deploy_jobs enable row level security;
