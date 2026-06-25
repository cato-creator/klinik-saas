-- ============================================================
-- controlplane/0001_init.sql — CONTROL-PLANE (project Supabase TERPISAH)
-- ------------------------------------------------------------
-- ⚠️ JALANKAN DI PROJECT SUPABASE CONTROL-PLANE, BUKAN project membership.
--
-- Project ini hanya menyimpan registry + secret klinik "self-hosted"
-- (one-time payment, infra Supabase & Cloudflare milik klinik sendiri).
-- Diakses HANYA server-side oleh panel super admin via SERVICE ROLE.
-- Tidak ada auth end-user di sini → semua tabel RLS ON tanpa policy
-- (anon/authenticated ditolak; service role tetap bypass).
--
-- Secret (service_role, db password, cloudflare token) disimpan TERENKRIPSI
-- (AES-256-GCM). Master key ada di env Worker (CONTROLPLANE_MASTER_KEY),
-- TIDAK PERNAH di DB ini. Jadi kalau DB ini bocor, isinya cuma ciphertext.
-- AMAN diulang (idempoten).
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================
-- REGISTRY KLINIK SELF-HOSTED
-- ============================================
create table if not exists selfhosted_clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  clinic_type text not null default 'fisioterapi'
    check (clinic_type in ('fisioterapi', 'okupasi_terapi')),
  -- kontak owner
  owner_name text,
  owner_email text,
  owner_phone text,
  -- lisensi (bayar sekali)
  license_status text not null default 'active'
    check (license_status in ('active', 'suspended')),
  license_paid_at timestamptz,
  license_amount numeric(12,2) default 0,
  maintenance_until date,                  -- opsional: batas pendampingan
  -- infrastruktur (URL & ID NON-rahasia → plaintext; key rahasia di tabel terpisah)
  target_domain text,
  supabase_url text,
  supabase_project_ref text,
  supabase_anon_key text,                  -- semi-publik (di-bake ke client) → boleh plaintext
  cloudflare_account_id text,
  cloudflare_pages_project text,
  -- status provisioning keseluruhan
  provisioning_status text not null default 'draft'
    check (provisioning_status in ('draft', 'provisioning', 'live', 'suspended', 'failed')),
  notes text,
  created_by uuid,                         -- id super admin (dari project membership); FK lintas-project tdk dipasang
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SECRET TERENKRIPSI (dipisah dari registry)
-- ============================================
-- Dipisah supaya menampilkan daftar klinik TIDAK ikut menarik rahasia.
create table if not exists selfhosted_secrets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references selfhosted_clinics(id) on delete cascade,
  secret_type text not null
    check (secret_type in ('supabase_service_role', 'supabase_db_password', 'cloudflare_token')),
  ciphertext text not null,                -- base64 hasil AES-256-GCM
  nonce text not null,                     -- base64 IV/nonce (12 byte)
  key_version int not null default 1,      -- utk rotasi master key nanti
  updated_by uuid,
  updated_at timestamptz default now(),
  unique (clinic_id, secret_type)
);

-- ============================================
-- CHECKLIST PROVISIONING (manual di Fase 1)
-- ============================================
create table if not exists selfhosted_provisioning_steps (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references selfhosted_clinics(id) on delete cascade,
  step_key text not null,                  -- supabase_migrated|owner_seeded|pages_created|env_set|dns_ok|smoke_test
  status text not null default 'pending'
    check (status in ('pending', 'done', 'skipped', 'failed')),
  notes text,
  done_by uuid,
  done_at timestamptz,
  updated_at timestamptz default now(),
  unique (clinic_id, step_key)
);

-- ============================================
-- AUDIT LOG (jejak akses/ubah secret & langkah)
-- ============================================
create table if not exists selfhosted_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  actor_email text,
  action text not null,                    -- secret.create|secret.update|secret.reveal|clinic.create|clinic.update|step.update
  clinic_id uuid,
  secret_type text,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

create index if not exists idx_sh_secrets_clinic on selfhosted_secrets(clinic_id);
create index if not exists idx_sh_steps_clinic on selfhosted_provisioning_steps(clinic_id);
create index if not exists idx_sh_audit_clinic on selfhosted_audit_logs(clinic_id);
create index if not exists idx_sh_audit_created on selfhosted_audit_logs(created_at);

-- ============================================
-- RLS: KUNCI TOTAL
-- ============================================
-- Tidak ada auth end-user di project ini. Aktifkan RLS TANPA policy apa pun
-- → anon & authenticated ditolak total; hanya SERVICE ROLE (panel kita) yang bypass.
alter table selfhosted_clinics enable row level security;
alter table selfhosted_secrets enable row level security;
alter table selfhosted_provisioning_steps enable row level security;
alter table selfhosted_audit_logs enable row level security;
