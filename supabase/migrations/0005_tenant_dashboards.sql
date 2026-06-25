-- ============================================================
-- 0005_tenant_dashboards.sql
-- Lapisan TENANT (dashboard owner/admin/terapis/pasien + booking + rekam medis).
-- Mengadopsi model data dari aplikasi klinik Play Kids, tetapi:
--   * MULTI-TENANT: semua tabel tenant punya clinic_id (FK clinics) + RLS isolasi.
--   * Identitas user tetap pakai tabel `users` kita (bukan `profiles`).
-- Jalankan SETELAH 0004_realtime.sql.
--
-- Catatan: tabel tenant di 0001 (therapists, therapist_schedules, patients,
-- bookings, soap_notes) BELUM dipakai kode apa pun (hanya panel super admin yang
-- live). Di sini kita redesign tabel-tabel itu ke model yang lebih kaya + clinic_id,
-- lalu menambah tabel fitur baru. Tabel platform (clinics, users, subscriptions,
-- affiliates, domains, landing_page_content, audit_logs) TIDAK disentuh.
-- ============================================================

-- ------------------------------------------------------------
-- 0. DROP tabel tenant lama (urut dependensi) + view turunannya
-- ------------------------------------------------------------
drop view if exists public_therapists;

drop table if exists soap_notes cascade;
drop table if exists bookings cascade;
drop table if exists therapist_schedules cascade;
drop table if exists patients cascade;
drop table if exists therapists cascade;

-- Catatan: helper RLS (my_therapist_ids / my_patient_ids /
-- my_therapist_patient_ids) DIDEFINISIKAN DI BAGIAN 11.5, SETELAH tabel yang
-- dirujuknya dibuat. Fungsi `language sql` divalidasi badannya saat dibuat,
-- jadi tidak boleh mendahului tabel therapists/patients/bookings.

-- ============================================================
-- 2. THERAPISTS (model Play Kids + clinic_id)
-- ============================================================
create table therapists (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  specialization  text[] default '{}',
  str_number      text,
  bio             text,
  photo_url       text,
  signature_url   text,           -- TTD utk CPPT & cetak rekam medis
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ============================================================
-- 3. PATIENTS (model Play Kids + clinic_id + rekam medis lanjutan)
-- ============================================================
create table patients (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references clinics(id) on delete cascade,
  user_id           uuid references users(id) on delete set null,
  medical_record_no text unique,                 -- RM-000001 (auto via trigger)
  full_name         text not null,
  phone             text not null,
  email             text,
  birth_date        date,
  gender            text check (gender in ('L', 'P')),
  guardian_name     text,
  diagnosis         text,
  allergies         text,
  special_alert     text,                         -- perhatian khusus (safety flag)
  session_package   integer,                      -- target jumlah sesi (paket)
  notes             text,
  source            text default 'guest_booking' check (source in ('guest_booking', 'manual_admin')),
  deleted_at        timestamptz,                  -- soft delete (retensi data medis)
  created_at        timestamptz default now(),
  unique (clinic_id, phone)
);

-- Generator No. RM global: RM-000001, RM-000002, ...
create sequence if not exists patient_rm_seq start 1;

create or replace function set_medical_record_no()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.medical_record_no is null then
    new.medical_record_no := 'RM-' || lpad(nextval('patient_rm_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists patients_set_rm on patients;
create trigger patients_set_rm
  before insert on patients
  for each row execute function set_medical_record_no();

-- ============================================================
-- 4. THERAPIST SCHEDULES & UNAVAILABLE
-- ============================================================
create table therapist_schedules (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  therapist_id  uuid not null references therapists(id) on delete cascade,
  day_of_week   int not null check (day_of_week between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  is_active     boolean default true
);

create table therapist_unavailable (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  therapist_id  uuid not null references therapists(id) on delete cascade,
  date          date not null,
  reason        text,
  created_at    timestamptz default now()
);

-- ============================================================
-- 5. SERVICE TYPES (jenis layanan terapi per klinik)
-- ============================================================
create table service_types (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  name         text not null,
  description  text,
  duration_min integer not null default 60,
  price        integer not null default 0,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ============================================================
-- 6. BOOKINGS (model Play Kids + clinic_id + anti double-booking)
-- ============================================================
-- Helper IMMUTABLE utk rentang slot. Pakai tsrange (timestamp tanpa tz) supaya
-- benar-benar immutable (boleh dipakai di generated column) — cukup utk deteksi
-- overlap dalam 1 klinik yang jam lokalnya konsisten.
create or replace function booking_slot_local(p_date date, p_time time, p_minutes int)
returns tsrange
language sql immutable
as $$
  select tsrange((p_date + p_time), (p_date + p_time) + make_interval(mins => p_minutes))
$$;

create table bookings (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references clinics(id) on delete cascade,
  booking_code      text not null unique,
  patient_id        uuid not null references patients(id) on delete cascade,
  therapist_id      uuid references therapists(id),          -- opsional
  service_type_id   uuid references service_types(id),
  session_date      date not null,
  session_time      time not null default '00:00',           -- '00:00' = belum dijadwalkan
  duration_min      integer not null default 60 check (duration_min > 0),
  status            text not null default 'pending'
                    check (status in ('pending','confirmed','in_progress','completed','cancelled')),
  notes_patient     text,
  payment_status    text not null default 'unpaid'
                    check (payment_status in ('unpaid','paid','refunded')),
  payment_method    text check (payment_method in ('qris','transfer','cash','bpjs')),
  payment_proof_url text,
  amount            integer not null default 0,
  created_by_role   text default 'patient',
  -- rentang slot utk pengecekan overlap (otomatis)
  slot tsrange generated always as (
    booking_slot_local(session_date, session_time, duration_min)
  ) stored,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  -- CEGAH double-booking: 1 terapis tidak boleh punya 2 booking aktif yang overlap.
  -- Tidak mengunci slot '00:00' (belum dijadwalkan) — durasi 0-range tetap aman
  -- karna && pada range kosong = false; tapi kita batasi eksplisit ke jam terjadwal.
  constraint no_overlapping_active_bookings exclude using gist (
    clinic_id with =,
    therapist_id with =,
    slot with &&
  ) where (
    status in ('pending','confirmed','in_progress')
    and therapist_id is not null
    and session_time <> '00:00'
  )
);

-- ============================================================
-- 7. SESSION NOTES (CPPT / SOAP per sesi)
-- ============================================================
create table session_notes (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  booking_id    uuid not null references bookings(id) on delete cascade,
  therapist_id  uuid not null references therapists(id),
  patient_id    uuid not null references patients(id),
  subjective    text,
  objective     text,
  assessment    text,
  plan          text,
  home_program  text,
  next_session  date,
  deleted_at    timestamptz,                       -- soft delete (retensi)
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 8. INVOICES & PAYMENTS
-- ============================================================
create table invoices (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references clinics(id) on delete cascade,
  invoice_number text not null unique,
  booking_id     uuid not null references bookings(id),
  patient_id     uuid not null references patients(id),
  amount         integer not null,
  discount       integer default 0,
  total          integer not null,
  issued_at      timestamptz default now(),
  paid_at        timestamptz,
  pdf_url        text
);

create table payments (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  booking_id      uuid not null references bookings(id),
  invoice_id      uuid references invoices(id),
  amount          integer not null,
  method          text not null check (method in ('qris','transfer','cash','bpjs')),
  proof_url       text,
  confirmed_by    uuid references users(id),
  confirmed_at    timestamptz,
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- 9. REKAM MEDIS LANJUTAN: asesmen, diagnosis, tindakan, target
-- ============================================================
create table assessments (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  patient_id      uuid not null references patients(id) on delete cascade,
  therapist_id    uuid references therapists(id),
  booking_id      uuid references bookings(id) on delete set null,
  chief_complaint text,
  history         text,
  physical_exam   text,
  rom             text,
  pain_scale      integer check (pain_scale between 0 and 10),
  notes           text,
  created_at      timestamptz default now()
);

create table diagnoses (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  patient_id   uuid not null references patients(id) on delete cascade,
  therapist_id uuid references therapists(id),
  icd10_code   text,
  description  text not null,
  dx_type      text not null default 'primary' check (dx_type in ('primary','secondary')),
  created_at   timestamptz default now()
);

create table treatments (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  patient_id   uuid not null references patients(id) on delete cascade,
  booking_id   uuid references bookings(id) on delete set null,
  therapist_id uuid references therapists(id),
  modality     text,
  description  text,
  created_at   timestamptz default now()
);

create table treatment_goals (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  patient_id   uuid not null references patients(id) on delete cascade,
  therapist_id uuid references therapists(id),
  description  text not null,
  status       text not null default 'in_progress' check (status in ('in_progress','achieved')),
  achieved_at  timestamptz,
  created_at   timestamptz default now()
);

-- ============================================================
-- 10. TRIGGER updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_updated_at on bookings;
create trigger bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

drop trigger if exists session_notes_updated_at on session_notes;
create trigger session_notes_updated_at
  before update on session_notes
  for each row execute function set_updated_at();

-- ============================================================
-- 11. INDEX
-- ============================================================
create index idx_therapists_clinic           on therapists(clinic_id);
create index idx_therapists_user             on therapists(user_id);
create index idx_patients_clinic             on patients(clinic_id);
create index idx_patients_clinic_phone       on patients(clinic_id, phone);
create index idx_patients_user               on patients(user_id);
create index idx_schedules_clinic            on therapist_schedules(clinic_id);
create index idx_schedules_therapist         on therapist_schedules(therapist_id);
create index idx_unavailable_therapist       on therapist_unavailable(therapist_id);
create index idx_service_types_clinic        on service_types(clinic_id);
create index idx_bookings_clinic             on bookings(clinic_id);
create index idx_bookings_session_date       on bookings(session_date);
create index idx_bookings_therapist          on bookings(therapist_id);
create index idx_bookings_patient            on bookings(patient_id);
create index idx_bookings_status             on bookings(status);
create index idx_session_notes_clinic        on session_notes(clinic_id);
create index idx_session_notes_booking       on session_notes(booking_id);
create index idx_session_notes_patient       on session_notes(patient_id);
create index idx_invoices_clinic             on invoices(clinic_id);
create index idx_invoices_booking            on invoices(booking_id);
create index idx_payments_clinic             on payments(clinic_id);
create index idx_payments_booking            on payments(booking_id);
create index idx_assessments_patient         on assessments(patient_id);
create index idx_diagnoses_patient           on diagnoses(patient_id);
create index idx_treatments_patient          on treatments(patient_id);
create index idx_treatment_goals_patient     on treatment_goals(patient_id);

-- ============================================================
-- 11.5 HELPER FUNCTIONS RLS (SECURITY DEFINER → bypass RLS terkontrol,
--      cegah rekursi silang antar policy). Didefinisikan SETELAH tabel ada.
-- ============================================================
-- ID terapis milik user yang login (1 user terapis = 1 baris therapists).
create or replace function my_therapist_ids()
returns setof uuid
language sql security definer stable set search_path = public
as $$
  select id from public.therapists where user_id = auth.uid();
$$;

-- ID pasien yang ter-link ke akun user yang login.
create or replace function my_patient_ids()
returns setof uuid
language sql security definer stable set search_path = public
as $$
  select id from public.patients where user_id = auth.uid();
$$;

-- ID pasien yang pernah ditangani terapis yang login (untuk akses rekam medis).
create or replace function my_therapist_patient_ids()
returns setof uuid
language sql security definer stable set search_path = public
as $$
  select distinct b.patient_id
  from public.bookings b
  where b.therapist_id in (
    select id from public.therapists where user_id = auth.uid()
  );
$$;

-- ============================================================
-- 12. ROW LEVEL SECURITY
-- Pola umum:
--   * super_admin: TIDAK diberi akses tabel rekam medis (privasi UU PDP).
--   * staff (owner/admin): kelola penuh dalam clinic_id sendiri.
--   * therapist: kelola data sesi/medis miliknya; baca pasien yang ditangani.
--   * patient: baca data miliknya sendiri.
-- ============================================================
alter table therapists            enable row level security;
alter table patients              enable row level security;
alter table therapist_schedules   enable row level security;
alter table therapist_unavailable enable row level security;
alter table service_types         enable row level security;
alter table bookings              enable row level security;
alter table session_notes         enable row level security;
alter table invoices              enable row level security;
alter table payments              enable row level security;
alter table assessments           enable row level security;
alter table diagnoses             enable row level security;
alter table treatments            enable row level security;
alter table treatment_goals       enable row level security;

-- ---- THERAPISTS ----
create policy "therapists_public_read" on therapists
  for select using (is_active = true);
create policy "therapists_self_read" on therapists
  for select using (user_id = (select auth.uid()));
create policy "therapists_self_update" on therapists
  for update using (user_id = (select auth.uid()));
create policy "therapists_staff_all" on therapists
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );

-- ---- PATIENTS ----
create policy "patients_self_read" on patients
  for select using (user_id = (select auth.uid()));
create policy "patients_staff_all" on patients
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "patients_therapist_read" on patients
  for select using (
    (select auth_user_role()) = 'therapist'
    and clinic_id = (select auth_user_clinic_id())
    and id in (select my_therapist_patient_ids())
  );

-- ---- THERAPIST SCHEDULES ----
create policy "schedules_public_read" on therapist_schedules
  for select using (true);
create policy "schedules_staff_all" on therapist_schedules
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "schedules_therapist_own" on therapist_schedules
  for all using (therapist_id in (select my_therapist_ids()));

-- ---- THERAPIST UNAVAILABLE ----
create policy "unavailable_public_read" on therapist_unavailable
  for select using (true);
create policy "unavailable_staff_all" on therapist_unavailable
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "unavailable_therapist_own" on therapist_unavailable
  for all using (therapist_id in (select my_therapist_ids()));

-- ---- SERVICE TYPES ----
create policy "service_types_public_read" on service_types
  for select using (is_active = true);
create policy "service_types_staff_all" on service_types
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );

-- ---- BOOKINGS ----
create policy "bookings_staff_all" on bookings
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "bookings_therapist_read" on bookings
  for select using (therapist_id in (select my_therapist_ids()));
create policy "bookings_patient_read" on bookings
  for select using (patient_id in (select my_patient_ids()));

-- ---- SESSION NOTES ----
create policy "notes_therapist_own" on session_notes
  for all using (therapist_id in (select my_therapist_ids()));
create policy "notes_staff_read" on session_notes
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "notes_patient_read" on session_notes
  for select using (patient_id in (select my_patient_ids()));

-- ---- INVOICES ----
create policy "invoices_staff_all" on invoices
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "invoices_patient_read" on invoices
  for select using (patient_id in (select my_patient_ids()));

-- ---- PAYMENTS ----
create policy "payments_staff_all" on payments
  for all using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );

-- ---- ASSESSMENTS / DIAGNOSES / TREATMENTS / GOALS (pola rekam medis) ----
create policy "assessments_therapist_own" on assessments
  for all using (therapist_id in (select my_therapist_ids()));
create policy "assessments_staff_read" on assessments
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "assessments_patient_read" on assessments
  for select using (patient_id in (select my_patient_ids()));

create policy "diagnoses_therapist_own" on diagnoses
  for all using (therapist_id in (select my_therapist_ids()));
create policy "diagnoses_staff_read" on diagnoses
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "diagnoses_patient_read" on diagnoses
  for select using (patient_id in (select my_patient_ids()));

create policy "treatments_therapist_own" on treatments
  for all using (therapist_id in (select my_therapist_ids()));
create policy "treatments_staff_read" on treatments
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "treatments_patient_read" on treatments
  for select using (patient_id in (select my_patient_ids()));

create policy "goals_therapist_own" on treatment_goals
  for all using (therapist_id in (select my_therapist_ids()));
create policy "goals_staff_read" on treatment_goals
  for select using (
    clinic_id = (select auth_user_clinic_id())
    and (select auth_user_role()) in ('owner','admin')
  );
create policy "goals_patient_read" on treatment_goals
  for select using (patient_id in (select my_patient_ids()));

-- ============================================================
-- 13. VIEW PUBLIK (column-safe) — booking page anon
-- ============================================================
create view public_therapists
with (security_invoker = on) as
  select t.id, t.clinic_id, t.specialization, t.bio, t.photo_url, t.is_active,
         u.full_name
  from therapists t
  join users u on u.id = t.user_id
  where t.is_active = true;  -- str_number & signature_url sengaja TIDAK diekspos

-- ============================================================
-- SELESAI 0005
-- ============================================================
