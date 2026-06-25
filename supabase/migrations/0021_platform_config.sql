-- ============================================================
-- 0021_platform_config.sql — Konfigurasi platform (super admin)
-- ------------------------------------------------------------
--  (item 9) platform_announcements : banner pengumuman dari platform ke dashboard
--           owner. Super admin kelola; owner (semua user login) baca yang aktif.
--  (item 10) plan_prices           : harga acuan plan 1/3/12 bulan, agar saat
--            approve/perpanjang nominalnya tinggal dipilih (tidak ketik manual).
-- AMAN diulang (idempoten). Jalankan SETELAH 0020.
-- ============================================================

-- ============================================
-- PENGUMUMAN PLATFORM
-- ============================================
create table if not exists platform_announcements (
  id          uuid primary key default gen_random_uuid(),
  message     text not null,
  level       text not null default 'info' check (level in ('info','warning','success')),
  is_active   boolean not null default true,
  created_by  uuid references users(id),
  created_at  timestamptz default now()
);

create index if not exists idx_platform_announcements_active on platform_announcements(is_active);

alter table platform_announcements enable row level security;

drop policy if exists "super_admin_manage_announcements" on platform_announcements;
create policy "super_admin_manage_announcements" on platform_announcements
  for all using ((select auth_user_role()) = 'super_admin');

-- Semua user login boleh membaca pengumuman yang aktif (untuk banner dashboard).
drop policy if exists "read_active_announcements" on platform_announcements;
create policy "read_active_announcements" on platform_announcements
  for select using (is_active = true);

-- ============================================
-- HARGA PLAN (acuan)
-- ============================================
create table if not exists plan_prices (
  plan_type  text primary key check (plan_type in ('1_month','3_month','1_year')),
  price      numeric(12,2) not null default 0,
  updated_at timestamptz default now()
);

insert into plan_prices (plan_type, price) values
  ('1_month', 0), ('3_month', 0), ('1_year', 0)
on conflict (plan_type) do nothing;

alter table plan_prices enable row level security;

drop policy if exists "super_admin_manage_plan_prices" on plan_prices;
create policy "super_admin_manage_plan_prices" on plan_prices
  for all using ((select auth_user_role()) = 'super_admin');
