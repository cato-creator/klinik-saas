-- ============================================================
-- 0001_schema.sql  —  Skema dasar Klinik Membership SaaS
-- Jalankan PERTAMA di Supabase SQL Editor.
-- ------------------------------------------------------------
-- Catatan: skema di CLAUDE.md punya FK melingkar
--   clinics.affiliate_id -> affiliates.id
--   clinics.approved_by  -> users.id
--   affiliates.user_id   -> users.id
--   users.clinic_id      -> clinics.id
-- Karena itu, kolom FK melingkar pada `clinics` dibuat dulu TANPA constraint,
-- lalu ditambahkan di akhir file (lihat bagian "FK FIXUPS").
-- ============================================================

-- Ekstensi yang dibutuhkan
create extension if not exists pgcrypto;       -- gen_random_uuid()
create extension if not exists btree_gist;     -- exclusion constraint anti double-booking

-- ============================================
-- CLINICS  (FK affiliate_id & approved_by ditambah belakangan)
-- ============================================
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text unique not null,
  clinic_type text not null default 'fisioterapi'
    check (clinic_type in ('fisioterapi', 'okupasi_terapi')),
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'active', 'expired', 'suspended', 'rejected')),
  address text,
  phone_number text,
  description text,
  logo_url text,
  operating_hours jsonb,
  affiliate_id uuid,   -- FK ditambah di akhir (-> affiliates.id)
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid     -- FK ditambah di akhir (-> users.id)
);

-- ============================================
-- USERS  (id sinkron dengan auth.users.id)
-- ============================================
create table users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade, -- null utk super_admin / affiliate
  role text not null check (role in ('super_admin', 'owner', 'admin', 'therapist', 'patient', 'affiliate')),
  full_name text not null,
  email text,
  phone_number text,
  status text not null default 'active' check (status in ('pending', 'active', 'inactive')),
  invited_by uuid references users(id),
  created_at timestamptz default now()
);

-- ============================================
-- DOMAINS (custom domain tier premium)
-- ============================================
create table domains (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  custom_domain text unique not null,
  verified boolean default false,
  verification_token text,
  created_at timestamptz default now()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  plan_type text not null check (plan_type in ('1_month', '3_month', '1_year')),
  amount numeric(12,2) not null default 0,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_by uuid references users(id),
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- AFFILIATES & COMMISSIONS (level platform)
-- ============================================
create table affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  email text,
  phone_number text,
  commission_rate numeric(5,4) not null default 0.10,
  payout_info text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  rate numeric(5,4) not null,
  amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  unique (subscription_id)
);

-- ============================================
-- LANDING PAGE CONTENT
-- ============================================
create table landing_page_content (
  clinic_id uuid primary key references clinics(id) on delete cascade,
  hero_title text,
  hero_subtitle text,
  about_text text,
  services jsonb,
  gallery_urls text[],
  contact_whatsapp text,
  updated_at timestamptz default now()
);

-- ============================================
-- TERAPIS & JADWAL
-- ============================================
create table therapists (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  specialization text,
  str_number text,
  bio text,
  created_at timestamptz default now()
);

create table therapist_schedules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  therapist_id uuid not null references therapists(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean default true
);

-- ============================================
-- PASIEN & BOOKING
-- ============================================
create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  full_name text not null,
  phone_number text not null,
  date_of_birth date,
  source text default 'guest_booking' check (source in ('guest_booking', 'manual_admin')),
  deleted_at timestamptz,
  created_at timestamptz default now(),
  unique (clinic_id, phone_number)
);

-- Helper IMMUTABLE untuk hitung rentang slot booking.
-- Penjumlahan `timestamptz + interval` bawaan ditandai STABLE (alasan DST utk
-- komponen hari/bulan), sehingga TIDAK bisa dipakai langsung di generated column
-- (error 42P17). Karena di sini hanya menambah MENIT, perhitungan ini benar-benar
-- immutable, jadi aman dibungkus fungsi IMMUTABLE.
create or replace function booking_slot(p_scheduled_at timestamptz, p_duration_minutes int)
returns tstzrange
language sql
immutable
as $$
  select tstzrange(p_scheduled_at, p_scheduled_at + make_interval(mins => p_duration_minutes))
$$;

create table bookings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  therapist_id uuid references therapists(id),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  slot tstzrange generated always as (
    booking_slot(scheduled_at, duration_minutes)
  ) stored,
  complaint text,
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz default now(),
  constraint no_overlapping_active_bookings exclude using gist (
    therapist_id with =,
    slot with &&
  ) where (status in ('pending_confirmation', 'confirmed') and therapist_id is not null)
);

create table soap_notes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  therapist_id uuid not null references therapists(id),
  subjective text,
  objective text,
  assessment text,
  plan text,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- AUDIT LOG
-- ============================================
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references users(id),
  actor_role text,
  clinic_id uuid references clinics(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

-- ============================================
-- FK FIXUPS — tambahkan FK melingkar pada clinics sekarang
-- (affiliates & users sudah ada)
-- ============================================
alter table clinics
  add constraint clinics_affiliate_id_fkey
  foreign key (affiliate_id) references affiliates(id);

alter table clinics
  add constraint clinics_approved_by_fkey
  foreign key (approved_by) references users(id);

-- ============================================
-- INDEX
-- ============================================
create index idx_users_clinic_id on users(clinic_id);
create index idx_bookings_clinic_id on bookings(clinic_id);
create index idx_patients_clinic_phone on patients(clinic_id, phone_number);
create index idx_subscriptions_clinic_id on subscriptions(clinic_id);
create index idx_subscriptions_expires_at on subscriptions(expires_at);
create index idx_clinics_affiliate_id on clinics(affiliate_id);
create index idx_affiliates_user_id on affiliates(user_id);
create index idx_affiliate_commissions_affiliate_id on affiliate_commissions(affiliate_id);
create index idx_affiliate_commissions_status on affiliate_commissions(status);
create index idx_bookings_therapist_scheduled on bookings(therapist_id, scheduled_at);
create index idx_audit_logs_clinic_id on audit_logs(clinic_id);
create index idx_audit_logs_actor on audit_logs(actor_user_id);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
