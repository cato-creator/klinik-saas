-- ============================================================
-- 0002_rls.sql  —  Helper functions, Row Level Security, View publik
-- Jalankan KEDUA (setelah 0001_schema.sql).
-- ============================================================

-- ============================================
-- HELPER FUNCTIONS (WAJIB SECURITY DEFINER + search_path terkunci)
-- Tanpa SECURITY DEFINER -> rekursi tak hingga (error 42P17) karena
-- tabel users juga di-RLS dan policy-nya memanggil fungsi ini lagi.
-- ============================================
create or replace function auth_user_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from users where id = auth.uid()
$$;

create or replace function auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from users where id = auth.uid()
$$;

-- ============================================
-- AKTIFKAN RLS
-- ============================================
alter table clinics enable row level security;
alter table domains enable row level security;
alter table subscriptions enable row level security;
alter table users enable row level security;
alter table landing_page_content enable row level security;
alter table therapists enable row level security;
alter table therapist_schedules enable row level security;
alter table patients enable row level security;
alter table bookings enable row level security;
alter table soap_notes enable row level security;
alter table affiliates enable row level security;
alter table affiliate_commissions enable row level security;
alter table audit_logs enable row level security;

-- ============ CLINICS ============
create policy "super_admin_full_access_clinics" on clinics
  for all using ((select auth_user_role()) = 'super_admin');

create policy "public_read_active_clinics" on clinics
  for select using (status in ('active', 'expired'));

create policy "owner_read_own_clinic" on clinics
  for select using (id = (select auth_user_clinic_id()));

create policy "owner_update_own_clinic" on clinics
  for update using (id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'owner');

create policy "affiliate_read_own_referred_clinics" on clinics
  for select using (
    (select auth_user_role()) = 'affiliate'
    and affiliate_id in (select id from affiliates where user_id = (select auth.uid()))
  );

-- ============ DOMAINS ============
create policy "super_admin_full_access_domains" on domains
  for all using ((select auth_user_role()) = 'super_admin');

create policy "public_read_verified_domains" on domains
  for select using (verified = true);

create policy "owner_manage_own_domains" on domains
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'owner');

-- ============ USERS ============
create policy "super_admin_full_access_users" on users
  for all using ((select auth_user_role()) = 'super_admin');

create policy "tenant_read_own_clinic_users" on users
  for select using (clinic_id = (select auth_user_clinic_id()));

create policy "owner_manage_admin_therapist" on users
  for insert with check (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) = 'owner'
    and role in ('admin', 'therapist')
  );

create policy "owner_update_staff" on users
  for update using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) = 'owner'
    and role in ('admin', 'therapist')
  );

-- ============ THERAPISTS ============
create policy "super_admin_full_access_therapists" on therapists
  for all using ((select auth_user_role()) = 'super_admin');

create policy "public_read_therapists" on therapists
  for select using (true);

create policy "owner_admin_manage_therapists" on therapists
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) in ('owner', 'admin'));

create policy "therapist_read_own_profile" on therapists
  for select using (clinic_id = (select auth_user_clinic_id()) and user_id = (select auth.uid()));

-- ============ THERAPIST SCHEDULES ============
create policy "super_admin_full_access_schedules" on therapist_schedules
  for all using ((select auth_user_role()) = 'super_admin');

create policy "public_read_active_schedules" on therapist_schedules
  for select using (is_active = true);

create policy "owner_admin_manage_schedules" on therapist_schedules
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) in ('owner', 'admin'));

create policy "therapist_read_own_schedules" on therapist_schedules
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and therapist_id in (select id from therapists where user_id = (select auth.uid()))
  );

-- ============ PATIENTS ============
create policy "super_admin_read_patients" on patients
  for select using ((select auth_user_role()) = 'super_admin');

create policy "staff_manage_patients" on patients
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) in ('owner', 'admin'));

create policy "therapist_read_clinic_patients" on patients
  for select using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'therapist');

create policy "patient_read_own_record" on patients
  for select using (clinic_id = (select auth_user_clinic_id()) and user_id = (select auth.uid()));

-- ============ BOOKINGS ============
create policy "tenant_isolated_bookings_select" on bookings
  for select using (clinic_id = (select auth_user_clinic_id()) or (select auth_user_role()) = 'super_admin');

create policy "staff_manage_bookings" on bookings
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner', 'admin')
  );

create policy "therapist_read_own_bookings" on bookings
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) = 'therapist'
    and therapist_id in (select id from therapists where user_id = (select auth.uid()))
  );

create policy "patient_read_own_bookings" on bookings
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) = 'patient'
    and patient_id in (select id from patients where user_id = (select auth.uid()))
  );

-- ============ SOAP NOTES ============
create policy "therapist_manage_own_soap_notes" on soap_notes
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) = 'therapist'
    and therapist_id in (select id from therapists where user_id = (select auth.uid()))
  );

create policy "owner_admin_read_soap_notes" on soap_notes
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner', 'admin')
  );

-- ============ SUBSCRIPTIONS ============
create policy "super_admin_full_access_subscriptions" on subscriptions
  for all using ((select auth_user_role()) = 'super_admin');

create policy "owner_read_own_subscription" on subscriptions
  for select using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'owner');

-- ============ AFFILIATES & COMMISSIONS ============
create policy "super_admin_full_access_affiliates" on affiliates
  for all using ((select auth_user_role()) = 'super_admin');

create policy "affiliate_read_own_profile" on affiliates
  for select using (user_id = (select auth.uid()));

create policy "super_admin_full_access_commissions" on affiliate_commissions
  for all using ((select auth_user_role()) = 'super_admin');

create policy "affiliate_read_own_commissions" on affiliate_commissions
  for select using (
    (select auth_user_role()) = 'affiliate'
    and affiliate_id in (select id from affiliates where user_id = (select auth.uid()))
  );

-- ============ LANDING PAGE CONTENT ============
create policy "public_read_landing_content" on landing_page_content
  for select using (true);

create policy "owner_manage_landing_content" on landing_page_content
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'owner');

-- ============ AUDIT LOGS ============
create policy "super_admin_read_audit_logs" on audit_logs
  for select using ((select auth_user_role()) = 'super_admin');

create policy "owner_read_own_clinic_audit" on audit_logs
  for select using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'owner');

-- ============================================
-- VIEW PUBLIK (column-safe, security_invoker)
-- Konsumsi anon (landing/booking) HARUS lewat view ini, bukan tabel mentah.
-- ============================================
create view public_clinics
with (security_invoker = on) as
  select id, name, subdomain, clinic_type, status, address,
         description, logo_url, operating_hours
  from clinics
  where status in ('active', 'expired');

create view public_therapists
with (security_invoker = on) as
  select t.id, t.clinic_id, t.specialization, t.bio, u.full_name
  from therapists t
  join users u on u.id = t.user_id;  -- str_number sengaja TIDAK diekspos
