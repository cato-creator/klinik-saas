-- ============================================================
-- 0003_auth_and_cron.sql  —  Sync auth.users -> public.users + cron expired
-- Jalankan KETIGA (setelah 0002_rls.sql).
-- ============================================================

-- ============================================
-- SYNC auth.users -> public.users
-- public.users.id HARUS sama dengan auth.users.id.
-- ============================================
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role, clinic_id, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    nullif(new.raw_user_meta_data->>'clinic_id', '')::uuid,
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ============================================
-- CRON: tandai langganan & klinik yang sudah expired (jalan harian)
-- Memakai pg_cron (gratis, tidak tergantung host) — lihat CLAUDE.md §3.5 & §12.1
-- ============================================
create extension if not exists pg_cron;

-- Fungsi yang men-set status expired.
create or replace function expire_due_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- tandai subscription yang lewat tanggal
  update subscriptions
     set status = 'expired'
   where status = 'active'
     and expires_at < now();

  -- kunci klinik yang TIDAK punya subscription aktif tersisa
  update clinics c
     set status = 'expired'
   where c.status = 'active'
     and not exists (
       select 1 from subscriptions s
        where s.clinic_id = c.id
          and s.status = 'active'
          and s.expires_at >= now()
     );
end;
$$;

-- Jadwalkan harian jam 00:05 UTC (~07:05 WIB). Aman dijalankan berkali-kali (idempotent).
select cron.schedule(
  'expire-subscriptions-daily',
  '5 0 * * *',
  $$select expire_due_subscriptions();$$
);
