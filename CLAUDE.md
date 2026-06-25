# Klinik Membership SaaS — CLAUDE.md

## 1. Ringkasan Proyek

Platform **multi-tenant SaaS** untuk klinik terapi. Super admin (owner platform) mengelola **banyak klinik** lintas tenant, menerima pendaftaran owner klinik, melakukan approval, dan provisioning subdomain. Setiap klinik (tenant) mendapat:

- 1 landing page publik (subdomain, custom domain opsional di tier premium)
- 1 sistem booking online (guest booking, tanpa wajib daftar akun)
- Dashboard per role: **Super Admin (platform)**, **Owner**, **Admin**, **Terapis**, **Pasien**, plus **Affiliator** (level platform, lihat bawah)

### Tipe Klinik (Clinic Type)
Platform mendukung **beberapa tipe/kategori klinik**. Untuk saat ini ada **2 tipe**:

- **`fisioterapi`** — klinik Fisioterapi
- **`okupasi_terapi`** — klinik Okupasi Terapi (OT)

Tiap tipe punya **landing page (template/tema) yang berbeda**. Saat **owner mendaftar**, dia memilih mau membuka klinik bertipe **Fisioterapi** atau **Okupasi Terapi**. Tipe ini menentukan template landing page yang dirender dan dapat memengaruhi terminologi/konten default. Arsitektur dibuat **extensible** agar tipe baru mudah ditambahkan nanti.

Model bisnis: langganan berbasis **durasi** (1 bulan / 3 bulan / 1 tahun), bukan tiering fitur. Saat expired, landing page tetap publik tapi booking & dashboard internal terkunci.

**Tech stack**: Next.js 14 (App Router), Supabase (single project region **Singapura/ap-southeast-1**, multi-tenant dengan RLS), **Cloudflare Workers** (deploy via adapter **OpenNext** `@opennextjs/cloudflare`). Wildcard subdomain via DNS Cloudflare; custom domain (tier premium) via **Cloudflare for SaaS (Custom Hostnames)**. Target biaya: **Rp0 di tier gratis** untuk ~5 klinik (lihat §12).

---

## 2. Arsitektur Multi-Tenant

### 2.1 Strategi Data
Single Supabase project. Semua tabel tenant-scoped punya kolom `clinic_id` (FK ke `clinics.id`). Isolasi data **sepenuhnya** mengandalkan RLS — tidak ada tabel data klinik yang boleh diakses tanpa filter `clinic_id`.

### 2.2 Strategi Domain
- **Subdomain** (wajib, default): `{subdomain}.platformlo.com` — di-assign oleh super admin saat approval.
- **Custom domain** (opsional, tier premium): klinik bisa pasang domain sendiri. Ditambahkan via **Cloudflare for SaaS (Custom Hostnames)** + verifikasi CNAME oleh owner.
- Routing dilakukan via Next.js Middleware yang membaca `host` header, mencocokkan ke `clinics.subdomain` atau `domains.custom_domain`, lalu inject `clinic_id` ke request context.

### 2.3 Routing Next.js (App Router + Middleware)
```
middleware.ts
  -> baca hostname
  -> query clinics WHERE subdomain = X OR (via tabel domains) custom_domain = X
  -> jika tidak ketemu -> redirect ke platformlo.com (landing utama platform)
  -> jika ketemu tapi subscription expired -> set flag locked=true, tetap render landing page, blokir route /booking dan /dashboard/*
  -> rewrite ke /app/(tenant)/[clinicId]/...
```

Struktur folder app:
```
app/
  (platform)/              # super admin & marketing utama platformlo.com
    admin/
    daftar/                # form signup owner (self-signup langsung, tanpa affiliator)
    affiliate/             # dashboard affiliator (tambah klinik, lihat klinik & komisi)
  (tenant)/
    [clinicId]/
      page.tsx             # landing page klinik (pilih template berdasarkan clinic_type)
      booking/
      dashboard/
        owner/
        admin/
        therapist/
        patient/
  _landing-templates/      # template landing page per tipe klinik
    fisioterapi/
    okupasi-terapi/
```

### 2.4 Landing Page per Tipe Klinik
- Kolom `clinics.clinic_type` menentukan template landing page mana yang dirender di `/[clinicId]/page.tsx`.
- Setiap tipe punya template/komponen sendiri (`_landing-templates/{tipe}/`) — layout, warna, copy default, dan ikon bisa berbeda. Konten spesifik klinik (logo, teks, foto, layanan) tetap diisi owner via `landing_page_content` dan diinjeksikan ke template.
- `page.tsx` melakukan switch sederhana: `clinic_type === 'fisioterapi' ? <FisioLanding /> : <OkupasiLanding />`. Tambah tipe baru = tambah satu folder template + satu cabang switch.
- Validasi: saat signup & approval, `clinic_type` wajib salah satu nilai yang valid. Tipe **tidak bisa diubah** owner setelah klinik dibuat (kalau perlu pindah tipe, lewat super admin).

---

## 3. Skenario Alur Lengkap

### 3.1 Owner Mendaftar (Self-Signup)
1. Owner buka `platformlo.com/daftar`
2. **Pilih tipe klinik**: Fisioterapi atau Okupasi Terapi (`clinic_type`)
3. Isi form: nama klinik, nama owner, email, no HP, alamat klinik, (opsional: dokumen izin praktik)
4. Insert ke `clinics` dengan `status = 'pending_approval'` dan `clinic_type` sesuai pilihan, insert ke `users` dengan `role = 'owner'`, `status = 'pending'`. `affiliate_id` = null (signup langsung tanpa affiliator)
5. Owner melihat halaman "Pendaftaran kamu sedang ditinjau"

> **3 cara klinik masuk ke platform:**
> 1. **Owner self-signup** lewat `/daftar` (alur di atas) — `affiliate_id` = null.
> 2. **Ditambahkan affiliator** lewat dashboard `/affiliate` (lihat 3.6) — `affiliate_id` terisi, affiliator berhak komisi.
> 3. **Ditambahkan super admin langsung** dari `/admin` — super admin isi data klinik + owner. Default `affiliate_id` = null (tanpa komisi), tapi super admin **boleh** meng-assign ke affiliator tertentu bila klinik itu memang hasil rujukan offline. Super admin bisa langsung sekalian approve, assign subdomain, dan set plan tanpa lewat antrian `pending_approval`.

### 3.2 Super Admin Approve
1. Super admin login ke `/admin` (dashboard super admin, bukan bagian dari tenant manapun)
2. Lihat list klinik `pending_approval` (termasuk `clinic_type` tiap pendaftar)
3. Review data (termasuk `clinic_type` — bisa dikoreksi super admin bila salah pilih) → assign `subdomain` (unik, divalidasi format) → pilih `plan_type` awal (1/3/12 bulan) → approve
4. Sistem set:
   - `clinics.status = 'active'`
   - `clinics.subdomain = {input super admin}`
   - `subscriptions` baru: `plan_type`, `started_at = now()`, `expires_at = now() + interval`
   - `users.status = 'active'` untuk owner
5. **Manual notifikasi**: super admin sendiri yang menghubungi owner (WA/email manual) memberi tahu klinik sudah aktif beserta link dashboard. Tidak ada auto-send dari sistem.

### 3.3 Owner Mengelola Klinik
1. Owner login → dashboard owner
2. Owner bisa:
   - Edit landing page (logo, deskripsi, jam praktik, alamat, foto)
   - Tambah **admin** baru (isi nama, email — akun langsung `active`, owner yang menyampaikan kredensial secara manual)
   - Tambah **terapis** baru (isi nama, email, jadwal praktik — akun langsung `active`)
   - Lihat status langganan & sisa masa aktif
   - (Tier premium) Tambah custom domain

> Catatan: karena notifikasi manual, saat owner/admin menambah user baru, sistem cukup generate password sementara yang ditampilkan SEKALI di layar (atau link set-password), lalu owner yang menyampaikan ke orangnya. Tidak ada email/WA otomatis di MVP ini.

### 3.4 Pasien Booking (Guest Flow)
1. Pasien buka landing page klinik → klik "Booking"
2. Isi form: nama, no HP, keluhan, pilih terapis (opsional) & **slot waktu yang tersedia** (UI hanya menampilkan slot bebas, lihat 3.4.1)
3. Request masuk ke **Route Handler** (`/app/api/booking/route.ts`, service role) yang melakukan **validasi server-side** sebelum insert (anti-spam + cek slot, lihat 3.4.1)
4. Sistem cek `patients` di clinic itu by `phone_number`:
   - Jika belum ada → create `patients` baru, `users` baru dengan `role = 'patient'`, `source = 'guest_booking'`
   - Jika sudah ada → pakai record yang ada
5. Insert ke `bookings` dengan `status = 'pending_confirmation'`. Jika slot bentrok, **exclusion constraint DB menolak** insert → kembalikan error "slot sudah terisi" (race-condition aman di level DB)
6. Admin/owner konfirmasi booking dari dashboard
7. Pasien mendapat cara akses dashboard pasien via **OTP berbasis no HP** (lihat 3.4.2)

#### 3.4.1 Slot & Availability (anti double-booking)
- Slot tersedia dihitung dari `therapist_schedules` (jam kerja per `day_of_week`) **dikurangi** booking aktif (`pending_confirmation`/`confirmed`) yang sudah ada untuk terapis itu pada hari tersebut.
- Durasi sesi disimpan di `bookings.duration_minutes` (default 60). Bisa di-derive dari layanan yang dipilih (`landing_page_content.services[].duration` bila diisi owner).
- **Dua lapis proteksi**:
  1. **UI/Route Handler**: hanya tawarkan & terima slot yang masih bebas.
  2. **Database**: `exclude constraint no_overlapping_active_bookings` menjamin tidak ada 2 booking aktif yang overlap untuk 1 terapis — ini pengaman terakhir terhadap race condition (2 orang booking slot sama bersamaan).
- Booking yang `cancelled`/`no_show`/`completed` tidak mengunci slot (constraint hanya berlaku utk status aktif).
- Jika `therapist_id` null (pasien tidak pilih terapis), slot tidak dikunci ke terapis tertentu; admin yang assign terapis saat konfirmasi (saat assign, validasi overlap lagi).

#### 3.4.2 Akses Dashboard Pasien (OTP) — butuh SMS provider
> **Keputusan penting**: login pasien via **OTP nomor HP** mengharuskan **pengiriman SMS otomatis** (Supabase Phone Auth + provider seperti Twilio/Vonage/MessageBird). Ini **bertentangan** dengan kebijakan "semua notifikasi manual" di MVP. Tiga opsi:
> 1. **(Direkomendasikan MVP)** Tunda self-login pasien. Pasien tidak punya login sendiri dulu; admin/owner yang melihat & menyampaikan info. Dashboard pasien diaktifkan di fase berikutnya.
> 2. Pakai **WhatsApp OTP** via provider WA Business API (lebih relevan utk pasar ID, tetap berbayar & perlu integrasi).
> 3. Aktifkan SMS OTP (Twilio dll) — anggap biaya & integrasi sejak awal.
>
> Pilihan ini ditandai di Bagian 11. Selama belum diputuskan, **Stage 7 (Dashboard Pasien) memakai opsi 1**.

### 3.5 Subscription Lifecycle
- Cron job **`pg_cron` Supabase** (default — gratis, tidak bergantung host) jalan harian: cek `subscriptions.expires_at < now()` → update `clinics.status = 'expired'`
- Saat `status = 'expired'`:
  - Landing page (`/[clinicId]`) tetap render normal — **publik tetap bisa lihat**
  - Route `/[clinicId]/booking` → tampilkan pesan "Booking online sedang tidak tersedia"
  - Route `/[clinicId]/dashboard/*` → block semua role kecuali owner, owner hanya bisa lihat halaman "Perpanjang langganan"
- Super admin bisa perpanjang manual dari `/admin` (insert `subscriptions` baru, update `clinics.status = 'active'`)

### 3.6 Affiliator & Profit Sharing
Tujuan: menjangkau lebih banyak membership lewat mitra (affiliator) yang membawa klinik baru.

**Affiliator ditambahkan oleh super admin** (bukan self-signup, tidak ada kode referral publik):

1. Super admin buka `/admin` → menu Affiliator → **tambah affiliator** (nama, email/HP, info pembayaran komisi) → set **`commission_rate` custom per affiliator** (mis. 10%). Akun affiliator dibuat dengan `users.role = 'affiliate'`, `clinic_id = null` (level platform).
2. Super admin menyampaikan kredensial ke affiliator secara manual (konsisten dengan kebijakan notifikasi manual MVP).
3. Affiliator login → dashboard `/affiliate`:
   - **Tambah klinik**: isi data klinik + owner. Klinik dibuat dengan `status = 'pending_approval'` dan **`clinics.affiliate_id` otomatis = affiliator yang menambahkan** (atribusi by "siapa yang menambahkan", bukan kode).
   - Lihat daftar klinik yang dia bawa beserta status langganannya.
   - Lihat ringkasan & riwayat komisi (pending / dibayar).
4. Super admin tetap melakukan approval, assign subdomain, dan set plan seperti biasa (alur 3.2). Klinik dari affiliator masuk antrian `pending_approval` yang sama.

**Perhitungan komisi**:
- Komisi dihitung saat sebuah `subscriptions` aktif tercatat untuk klinik yang punya `affiliate_id` (yaitu saat approval awal dan **setiap perpanjangan/renewal** — model *recurring*, default; bisa diubah ke first-payment-only nanti).
- Nominal = `commission_rate` (snapshot saat itu) × `subscriptions.amount`. Catat sebagai baris di `affiliate_commissions` dengan `status = 'pending'`.
- Pembayaran komisi ke affiliator dilakukan **manual oleh super admin** (di luar sistem), lalu super admin menandai baris komisi `status = 'paid'` dari `/admin`.
- Komisi butuh nilai uang langganan, jadi `subscriptions` punya kolom `amount` (harga yang dibayar klinik untuk periode itu).

---

## 4. Database Schema (Supabase / PostgreSQL)

```sql
-- ============================================
-- PLATFORM LEVEL
-- ============================================

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text unique not null,
  clinic_type text not null default 'fisioterapi'
    check (clinic_type in ('fisioterapi', 'okupasi_terapi')), -- menentukan template landing page
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'active', 'expired', 'suspended', 'rejected')),
  address text,
  phone_number text,
  description text,
  logo_url text,
  operating_hours jsonb,            -- { "mon": "08:00-17:00", ... }
  affiliate_id uuid references affiliates(id), -- affiliator yang membawa klinik (null jika self-signup)
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references users(id)
);

create table domains (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  custom_domain text unique not null,
  verified boolean default false,
  verification_token text,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  plan_type text not null check (plan_type in ('1_month', '3_month', '1_year')),
  amount numeric(12,2) not null default 0,  -- harga yg dibayar klinik utk periode ini (basis komisi affiliator)
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_by uuid references users(id),  -- super admin yang approve
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- AFFILIATOR & PROFIT SHARING (level platform)
-- ============================================

create table affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade, -- akun login affiliator (role = 'affiliate')
  full_name text not null,
  email text,
  phone_number text,
  commission_rate numeric(5,4) not null default 0.10, -- 0.10 = 10%, di-custom super admin per affiliator
  payout_info text,           -- info rekening/e-wallet utk pembayaran komisi manual
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references users(id),  -- super admin yang menambahkan
  created_at timestamptz default now()
);

create table affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  rate numeric(5,4) not null,      -- snapshot commission_rate saat komisi dibuat
  amount numeric(12,2) not null,   -- rate * subscriptions.amount
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  unique (subscription_id)         -- 1 komisi per pembayaran langganan
);

-- ============================================
-- USERS (semua role, dibedakan kolom role + clinic_id nullable utk super_admin/affiliate)
-- ============================================

create table users (
  id uuid primary key default gen_random_uuid(), -- sinkron dgn auth.users.id
  clinic_id uuid references clinics(id) on delete cascade, -- null utk super_admin
  role text not null check (role in ('super_admin', 'owner', 'admin', 'therapist', 'patient', 'affiliate')),
  full_name text not null,
  email text,
  phone_number text,
  status text not null default 'active' check (status in ('pending', 'active', 'inactive')),
  invited_by uuid references users(id),
  created_at timestamptz default now()
);

-- ============================================
-- TENANT LEVEL — LANDING PAGE
-- ============================================

create table landing_page_content (
  clinic_id uuid primary key references clinics(id) on delete cascade,
  hero_title text,
  hero_subtitle text,
  about_text text,
  services jsonb,         -- [{ "name": "...", "description": "...", "price": ... }]
  gallery_urls text[],
  contact_whatsapp text,
  updated_at timestamptz default now()
);

-- ============================================
-- TENANT LEVEL — TERAPIS & JADWAL
-- ============================================

create table therapists (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  specialization text,
  str_number text,        -- nomor surat tanda registrasi
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
-- TENANT LEVEL — PASIEN & BOOKING
-- ============================================

create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  full_name text not null,
  phone_number text not null,
  date_of_birth date,
  source text default 'guest_booking' check (source in ('guest_booking', 'manual_admin')),
  deleted_at timestamptz,   -- soft delete: data pasien tidak di-hard-delete (retensi)
  created_at timestamptz default now(),
  unique (clinic_id, phone_number)
);

-- diperlukan utk exclusion constraint (anti double-booking)
create extension if not exists btree_gist;

create table bookings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  therapist_id uuid references therapists(id),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  -- rentang waktu booking, dihitung otomatis utk pengecekan overlap
  slot tstzrange generated always as (
    tstzrange(scheduled_at, scheduled_at + make_interval(mins => duration_minutes))
  ) stored,
  complaint text,
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz default now(),
  -- CEGAH double-booking: 1 terapis tidak boleh punya 2 booking aktif yang waktunya overlap
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
  deleted_at timestamptz,   -- soft delete: data medis tidak di-hard-delete (retensi)
  created_at timestamptz default now()
);

-- ============================================
-- AUDIT LOG (jejak aktivitas sensitif)
-- ============================================
-- Mencatat aksi penting: aktivitas super admin (approve, perpanjang, set komisi),
-- dan AKSES/UBAH data medis (soap_notes) utk kebutuhan privasi (UU PDP).
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references users(id),   -- siapa
  actor_role text,                           -- snapshot role saat aksi
  clinic_id uuid references clinics(id) on delete set null,
  action text not null,                      -- mis. 'clinic.approve', 'soap.view', 'soap.update', 'commission.paid'
  entity_type text,                          -- 'clinic' | 'subscription' | 'soap_note' | 'affiliate' | ...
  entity_id uuid,
  metadata jsonb,                            -- detail tambahan (jangan simpan isi medis lengkap)
  ip_address inet,
  created_at timestamptz default now()
);

-- ============================================
-- SYNC auth.users -> public.users
-- ============================================
-- public.users.id HARUS sama dengan auth.users.id. Saat akun auth dibuat,
-- buat baris profil di public.users. Detail role/clinic_id diisi oleh proses
-- signup/Route Handler (raw_user_meta_data) atau di-update setelahnya.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
```

### Index penting
```sql
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
```

---

## 5. Row Level Security (RLS)

Prinsip: **setiap query tenant-scoped HARUS difilter `clinic_id` sesuai user yang login**, kecuali super admin (boleh lintas klinik tapi tetap dibatasi kolom yang sensitif sesuai kebutuhan).

```sql
-- Helper function: ambil clinic_id dan role dari user yang sedang login.
-- WAJIB SECURITY DEFINER + search_path terkunci. Tanpa ini, karena tabel `users`
-- juga punya RLS, fungsi ini akan memicu policy `users` yang memanggil fungsi ini
-- lagi -> rekursi tak hingga / error 42P17. SECURITY DEFINER membuat fungsi
-- membaca `users` mem-bypass RLS secara terkontrol (read-only, hanya baris auth.uid()).
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

-- Catatan performa: di dalam policy, panggil sebagai (select auth_user_role())
-- dan (select auth_user_clinic_id()) agar Postgres meng-cache hasilnya per-statement
-- (initPlan), bukan mengeksekusi ulang per-baris. Contoh di policy bawah disederhanakan;
-- pada implementasi nyata bungkus dengan select.

-- Aktifkan RLS di semua tabel tenant-scoped
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
  for all using (auth_user_role() = 'super_admin');

-- PERHATIAN: RLS bersifat row-level, BUKAN column-level. Policy publik di bawah
-- mengekspos SEMUA kolom clinics (termasuk phone_number internal, affiliate_id,
-- approved_by) ke anon. Untuk konsumsi publik (landing page), JANGAN query tabel
-- clinics langsung dari client anon — pakai VIEW publik `public_clinics` (lihat akhir
-- bagian ini) yang hanya membuka kolom aman. Policy ini tetap ada agar resolusi
-- internal & SSR berfungsi, tapi akses anon diarahkan ke view.
create policy "public_read_active_clinics" on clinics
  for select using (status in ('active', 'expired')); -- landing page tetap publik walau expired

create policy "owner_read_own_clinic" on clinics
  for select using (id = auth_user_clinic_id());

create policy "owner_update_own_clinic" on clinics
  for update using (id = auth_user_clinic_id() and auth_user_role() = 'owner');

create policy "affiliate_read_own_referred_clinics" on clinics
  for select using (
    auth_user_role() = 'affiliate'
    and affiliate_id in (select id from affiliates where user_id = auth.uid())
  );

-- ============ DOMAINS ============
create policy "super_admin_full_access_domains" on domains
  for all using (auth_user_role() = 'super_admin');

create policy "public_read_verified_domains" on domains
  for select using (verified = true); -- middleware perlu resolve custom domain -> clinic (anon)

create policy "owner_manage_own_domains" on domains
  for all using (clinic_id = auth_user_clinic_id() and auth_user_role() = 'owner');

-- ============ USERS ============
create policy "super_admin_full_access_users" on users
  for all using (auth_user_role() = 'super_admin');

create policy "tenant_read_own_clinic_users" on users
  for select using (clinic_id = auth_user_clinic_id());

create policy "owner_manage_admin_therapist" on users
  for insert with check (
    clinic_id = auth_user_clinic_id()
    and auth_user_role() = 'owner'
    and role in ('admin', 'therapist')
  );

create policy "owner_update_staff" on users
  for update using (
    clinic_id = auth_user_clinic_id()
    and auth_user_role() = 'owner'
    and role in ('admin', 'therapist')
  );

-- ============ THERAPISTS ============
create policy "super_admin_full_access_therapists" on therapists
  for all using (auth_user_role() = 'super_admin');

create policy "public_read_therapists" on therapists
  for select using (true); -- booking page perlu daftar terapis (anon). Kolom sensitif (str_number) sebaiknya tdk ditarik dari client publik; pakai view publik jika perlu.

create policy "owner_admin_manage_therapists" on therapists
  for all using (clinic_id = auth_user_clinic_id() and auth_user_role() in ('owner', 'admin'));

create policy "therapist_read_own_profile" on therapists
  for select using (clinic_id = auth_user_clinic_id() and user_id = auth.uid());

-- ============ THERAPIST SCHEDULES ============
create policy "super_admin_full_access_schedules" on therapist_schedules
  for all using (auth_user_role() = 'super_admin');

create policy "public_read_active_schedules" on therapist_schedules
  for select using (is_active = true); -- booking page perlu hitung slot tersedia (anon)

create policy "owner_admin_manage_schedules" on therapist_schedules
  for all using (clinic_id = auth_user_clinic_id() and auth_user_role() in ('owner', 'admin'));

create policy "therapist_read_own_schedules" on therapist_schedules
  for select using (
    clinic_id = auth_user_clinic_id()
    and therapist_id in (select id from therapists where user_id = auth.uid())
  );

-- ============ PATIENTS ============
-- Insert pasien guest dilakukan server-side via service role (lihat catatan bawah).
create policy "super_admin_read_patients" on patients
  for select using (auth_user_role() = 'super_admin');

create policy "staff_manage_patients" on patients
  for all using (clinic_id = auth_user_clinic_id() and auth_user_role() in ('owner', 'admin'));

create policy "therapist_read_clinic_patients" on patients
  for select using (clinic_id = auth_user_clinic_id() and auth_user_role() = 'therapist');

create policy "patient_read_own_record" on patients
  for select using (clinic_id = auth_user_clinic_id() and user_id = auth.uid());

-- ============ BOOKINGS ============
create policy "tenant_isolated_bookings_select" on bookings
  for select using (clinic_id = auth_user_clinic_id() or auth_user_role() = 'super_admin');

create policy "staff_manage_bookings" on bookings
  for all using (
    clinic_id = auth_user_clinic_id()
    and auth_user_role() in ('owner', 'admin')
  );

create policy "therapist_read_own_bookings" on bookings
  for select using (
    clinic_id = auth_user_clinic_id()
    and auth_user_role() = 'therapist'
    and therapist_id in (select id from therapists where user_id = auth.uid())
  );

create policy "patient_read_own_bookings" on bookings
  for select using (
    clinic_id = auth_user_clinic_id()
    and auth_user_role() = 'patient'
    and patient_id in (select id from patients where user_id = auth.uid())
  );

-- Guest booking insert (sebelum auth, pakai service role dari API route, BUKAN client-side langsung)
-- => booking creation untuk guest dilakukan via Next.js Route Handler dengan service role key,
--    setelah validasi server-side. Jangan expose insert langsung ke anon client untuk tabel bookings/patients.

-- ============ SOAP NOTES ============
create policy "therapist_manage_own_soap_notes" on soap_notes
  for all using (
    clinic_id = auth_user_clinic_id()
    and auth_user_role() = 'therapist'
    and therapist_id in (select id from therapists where user_id = auth.uid())
  );

create policy "owner_admin_read_soap_notes" on soap_notes
  for select using (
    clinic_id = auth_user_clinic_id()
    and auth_user_role() in ('owner', 'admin')
  );

-- ============ SUBSCRIPTIONS ============
create policy "super_admin_full_access_subscriptions" on subscriptions
  for all using (auth_user_role() = 'super_admin');

create policy "owner_read_own_subscription" on subscriptions
  for select using (clinic_id = auth_user_clinic_id() and auth_user_role() = 'owner');

-- ============ AFFILIATES & COMMISSIONS ============
create policy "super_admin_full_access_affiliates" on affiliates
  for all using (auth_user_role() = 'super_admin');

create policy "affiliate_read_own_profile" on affiliates
  for select using (user_id = auth.uid());

create policy "super_admin_full_access_commissions" on affiliate_commissions
  for all using (auth_user_role() = 'super_admin');

create policy "affiliate_read_own_commissions" on affiliate_commissions
  for select using (
    auth_user_role() = 'affiliate'
    and affiliate_id in (select id from affiliates where user_id = auth.uid())
  );

-- ============ LANDING PAGE CONTENT ============
create policy "public_read_landing_content" on landing_page_content
  for select using (true); -- publik, semua orang baca

create policy "owner_manage_landing_content" on landing_page_content
  for all using (clinic_id = auth_user_clinic_id() and auth_user_role() = 'owner');

-- ============ AUDIT LOGS ============
-- Penulisan audit log dilakukan server-side (service role). Akses baca terbatas.
create policy "super_admin_read_audit_logs" on audit_logs
  for select using (auth_user_role() = 'super_admin');

create policy "owner_read_own_clinic_audit" on audit_logs
  for select using (clinic_id = auth_user_clinic_id() and auth_user_role() = 'owner');

-- ============ VIEW PUBLIK (column-safe) ============
-- Konsumsi anon (landing page, booking page) HARUS lewat view ini, bukan tabel mentah,
-- supaya kolom internal tidak bocor. View dibuat security_invoker = on agar RLS tabel
-- dasar tetap berlaku.
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
```

> **Penting**: tabel `patients` dan `bookings` untuk alur **guest** (belum login) tidak boleh di-insert langsung dari client menggunakan anon key. Gunakan **Next.js Route Handler** (`/app/api/booking/route.ts`) yang jalan di server, validasi input, lalu insert pakai **service role key** (bypass RLS secara terkontrol). Ini mencegah orang iseng insert booking palsu lintas klinik dari browser console.
>
> **Anti-abuse pada Route Handler booking** (endpoint publik, rawan spam/enumerasi):
> - **Rate limit** per IP + per nomor HP (mis. Upstash Ratelimit / token bucket).
> - **Honeypot field** + opsional **CAPTCHA** (Turnstile/hCaptcha) bila spam meningkat.
> - Validasi `clinic_id` cocok dengan host yang merequest (jangan percaya body), validasi nomor HP & format, tolak `scheduled_at` di masa lalu / di luar jam praktik.
> - Jangan bocorkan apakah nomor HP sudah terdaftar (hindari user enumeration).

> **Penting (affiliator)**: saat affiliator menambahkan klinik, pembuatan `clinics` + akun `users` owner + set `affiliate_id` dilakukan via **Route Handler dengan service role** (validasi server-side), bukan insert langsung dari client. Begitu juga pembuatan baris `affiliate_commissions` saat ada langganan baru/renewal — dihitung server-side, jangan pernah dari client. Affiliator hanya punya akses **SELECT** ke klinik yang dia bawa & komisinya sendiri.

---

## 6. Middleware Lock saat Subscription Expired

```typescript
// middleware.ts (pseudo-logic)
export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host');
  const clinic = await resolveClinicByHostname(hostname); // subdomain atau custom_domain

  if (!clinic) {
    return NextResponse.redirect(new URL('https://platformlo.com'));
  }

  const isLocked = clinic.status === 'expired';
  const path = req.nextUrl.pathname;

  if (isLocked) {
    if (path.includes('/booking')) {
      return NextResponse.rewrite(new URL(`/locked/booking`, req.url));
    }
    if (path.includes('/dashboard') && !path.includes('/dashboard/owner/billing')) {
      return NextResponse.redirect(new URL(`/dashboard/owner/billing`, req.url));
    }
  }

  // inject clinic_id ke header agar bisa dibaca di server components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-clinic-id', clinic.id);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

---

## 7. Role Permission Matrix

| Aksi | Super Admin | Owner | Admin | Terapis | Pasien | Affiliator |
|---|---|---|---|---|---|---|
| Approve klinik baru | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign subdomain | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Perpanjang langganan | ✅ | ❌ (hanya lihat) | ❌ | ❌ | ❌ | ❌ |
| Edit landing page | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tambah admin/terapis | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola booking (confirm/cancel) | ❌ | ✅ | ✅ | ❌ (lihat saja) | ❌ | ❌ |
| Isi SOAP notes | ❌ | ❌ (lihat saja) | ❌ (lihat saja) | ✅ (pasien sendiri) | ❌ | ❌ |
| Lihat riwayat booking sendiri | ❌ | — | — | ✅ (miliknya) | ✅ (miliknya) | ❌ |
| Tambah custom domain | ❌ | ✅ (tier premium) | ❌ | ❌ | ❌ | ❌ |
| Tambah/kelola affiliator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Set persentase komisi affiliator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tambah klinik baru langsung | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Assign/ubah affiliator sebuah klinik | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat klinik yang dibawa & komisi sendiri | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (miliknya) |
| Tandai komisi sudah dibayar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 8. Storage File (Supabase Storage)

Upload file (logo, galeri, dokumen izin praktik) **tidak** disimpan di tabel sebagai blob — pakai **Supabase Storage** dan simpan hanya URL/path-nya di DB.

**Bucket & strukturnya** (path selalu diawali `clinic_id` utk isolasi):
- `clinic-public/` — **public bucket**: logo, foto galeri. Path: `clinic-public/{clinic_id}/...`. Boleh diakses anon (tampil di landing page).
- `clinic-docs/` — **private bucket**: dokumen izin praktik / STR / hal sensitif. Path: `clinic-docs/{clinic_id}/...`. Hanya diakses via **signed URL** berdurasi pendek; tidak pernah publik.

**Storage RLS (policy di `storage.objects`)**:
- Public bucket: read anon diizinkan; write hanya owner klinik terkait (cek `(storage.foldername(name))[1] = auth_user_clinic_id()::text`).
- Private bucket: read & write hanya owner/super_admin untuk `clinic_id`-nya; akses pengguna lain lewat signed URL yang digenerate server-side.
- **Validasi upload**: batasi mime-type (image/* utk galeri & logo; pdf/image utk dokumen), batasi ukuran, generate nama file acak (hindari overwrite & path traversal).

---

## 9. Keamanan, Privasi & Operasional

### 9.1 Privasi Data Medis (UU PDP)
- `soap_notes` & `patients` = data kesehatan sensitif. **Jangan hard-delete** — pakai kolom `deleted_at` (soft delete) dan filter `deleted_at is null` di query.
- **Klinik tidak pernah di-hard-delete.** Gunakan `clinics.status` (`suspended`/`rejected`) untuk menonaktifkan. FK `on delete cascade` pada banyak tabel hanya jaring pengaman; alur operasional normal **tidak boleh** `DELETE FROM clinics`. Jika benar-benar harus menghapus tenant, lakukan **export + anonymisasi** rekam medis lebih dulu sesuai retensi.
- **Super admin tidak melihat isi SOAP notes** lintas klinik (lihat Bagian 11) — cukup metadata agregat. Tidak ada RLS yang memberi super admin akses baca `soap_notes`.
  - **Pengecualian (diputuskan 2026-06-24): export serah-terima data.** Super admin BOLEH meng-export data pasien + rekam medis (SOAP & anamnesis) sebuah klinik **khusus untuk serah-terima data atas permintaan owner** (mis. klinik pindah/keluar platform), termasuk klinik `suspended`/`expired`. Caranya **bukan** lewat RLS (super admin tetap tidak punya policy baca `soap_notes`), melainkan lewat **Route Handler service role** `POST /api/admin/pasien/export` yang **wajib menyertakan alasan** dan **selalu mencatat `audit_logs`** via `logMedicalAccess` (`action = 'patient.export_full'`, metadata berisi alasan + jumlah, TANPA isi medis). Ini akses terkontrol & terjejak, bukan pemantauan rutin.
- **Audit medis**: setiap `view`/`update` pada `soap_notes` dicatat ke `audit_logs` (dilakukan server-side saat data diakses), supaya ada jejak siapa membuka rekam medis.

### 9.2 Bootstrap Super Admin
- Super admin pertama **tidak** lewat UI signup. Buat lewat **seed script / migration**: buat user di `auth.users` (via Supabase Admin API) lalu set baris `public.users` dengan `role = 'super_admin'`, `clinic_id = null`. Dokumentasikan di `scripts/seed-super-admin.ts`.

### 9.3 Resolusi Hostname & Subdomain
- Middleware resolve klinik via **view publik** (`public_clinics` utk subdomain, dan tabel `domains` yg `verified = true` utk custom domain) — bukan tabel mentah.
- **Reserved subdomain**: blacklist (`www`, `app`, `admin`, `api`, `mail`, `static`, `assets`, `platformlo`, dst.) divalidasi saat super admin assign subdomain.
- **Validasi format subdomain**: lowercase, `[a-z0-9-]`, 3–63 char, tidak diawali/diakhiri `-`, unik.
- **Local dev**: wildcard subdomain susah di localhost. Pakai `{subdomain}.localhost:3000` (didukung browser modern) atau override `?__clinic={subdomain}` khusus `NODE_ENV=development`.

### 9.4 Rahasia & Service Role
- `SUPABASE_SERVICE_ROLE_KEY` **hanya** dipakai di server (Route Handlers / server actions), tidak pernah ter-bundle ke client. Simpan di env Vercel (server-only), bukan `NEXT_PUBLIC_*`.
- Operasi yang mem-bypass RLS (guest booking, affiliator tambah klinik, generate komisi, tulis audit log) **terpusat** di Route Handler tervalidasi.

---

## 10. Tahapan Pengembangan (Development Stages)

1. **Stage 1 — Fondasi**: setup Next.js + Supabase project, schema dasar (`clinics`, `users`, `subscriptions`), RLS helper functions (**SECURITY DEFINER**), trigger sync `auth.users → public.users`, **seed super admin** (9.2)
2. **Stage 2 — Super Admin Panel**: form approval klinik, assign subdomain (validasi format + reserved), kelola subscription manual (set `amount`), tambah klinik langsung
3. **Stage 3 — Owner Onboarding & Dashboard**: landing page editor + upload ke Supabase Storage (Bagian 8), invite admin/terapis (generate password sementara)
4. **Stage 4 — Subdomain Routing & Middleware**: wildcard domain Vercel, middleware resolve clinic via `public_clinics`/`domains`, lock logic saat expired, override subdomain lokal (9.3)
5. **Stage 5 — Booking Publik (Guest Flow)**: booking form dgn **slot availability** (3.4.1), Route Handler (service role) + **anti-abuse** (rate limit/captcha), auto-create patient, exclusion constraint anti double-booking
6. **Stage 6 — Dashboard Admin & Terapis**: kelola booking (assign terapis + revalidasi overlap), jadwal terapis, SOAP notes + **audit log akses medis**
7. **Stage 7 — Dashboard Pasien**: akses pasien sesuai keputusan OTP (default **opsi 1**: tunda self-login, lihat 3.4.2), riwayat booking & ringkasan terapi
8. **Stage 8 — Custom Domain (Tier Premium)**: integrasi **Cloudflare for SaaS (Custom Hostnames)**, verifikasi CNAME
9. **Stage 9 — Affiliator & Profit Sharing**: super admin tambah/kelola affiliator + set `commission_rate`, dashboard affiliator (tambah klinik via service-role Route Handler, lihat klinik & komisi), generate baris `affiliate_commissions` saat langganan baru/renewal, super admin tandai komisi `paid`
10. **Stage 10 — Polish & Edge Cases**: subdomain collision/reserved handling, soft-delete & retensi data medis, audit log lengkap, hardening RLS & Storage policies

---

## 11. Hal yang Masih Perlu Diputuskan Nanti
- Harga tiap plan (1/3/12 bulan) dan apakah ada diskon otomatis untuk plan tahunan
- Mekanisme reset password untuk admin/terapis/owner (saat ini hanya dijelaskan generate password sementara — perlu flow lupa password)
- Apakah super admin perlu melihat data SOAP notes pasien lintas klinik (isu privasi medis — sebaiknya **tidak**, cukup metadata jumlah booking/aktivitas)
- Limit jumlah admin/terapis per klinik (apakah dibatasi per plan, atau bebas)
- **Akses pasien (OTP)**: tunda self-login (opsi 1) vs WhatsApp OTP vs SMS OTP — perlu putuskan provider & biaya (lihat 3.4.2)
- **Pembayaran langganan**: tetap manual (super admin catat `amount`) vs integrasi payment gateway (Midtrans/Xendit) nanti

---

## 12. Hosting: Cloudflare + Supabase (Free-First, Performa)

Target: jalankan platform dengan **biaya seminim mungkin (Rp0)** untuk ~5 klinik, tanpa perlu migrasi host nanti.

### 12.1 Stack hosting
- **Compute**: **Cloudflare Workers**, Next.js dideploy via adapter **OpenNext** (`@opennextjs/cloudflare`) — cara resmi & terbaru menjalankan Next.js App Router di Cloudflare (mendukung Node runtime). Hindari adapter lama `next-on-pages`.
- **Database/Auth/Storage**: **Supabase**, project region **Singapura (ap-southeast-1)** — terdekat ke user Indonesia.
- **DNS + domain**: domain sendiri di Cloudflare. Wildcard subdomain `*.domain` lewat DNS Cloudflare (proxied). Custom domain per klinik (tier premium) lewat **Cloudflare for SaaS / Custom Hostnames**.
- **Cron**: **`pg_cron` Supabase** (gratis, tidak bergantung host).

### 12.2 Kenapa Cloudflare (bukan Vercel)
- **Vercel Hobby = non-komersial** (langgar ToS untuk produk berbayar). Tier gratis Cloudflare **boleh komersial**.
- Mulai langsung di Cloudflare = **tidak ada migrasi** menyakitkan dari Vercel nanti.

### 12.3 Aturan PERFORMA (wajib diikuti — biar tidak "lemot")
Lemot pada Cloudflare+Supabase hampir selalu karena edge jauh dari DB + query waterfall. Default proyek:
1. **DB di Singapura** (sudah di 12.1).
2. **Smart Placement ON** di Cloudflare — otomatis menjalankan worker mendekat ke DB saat bottleneck-nya query DB.
3. **Landing page & konten publik di-cache / ISR** di edge Cloudflare → mayoritas request publik tidak menyentuh Supabase. Dashboard (login) = dynamic.
4. **Hindari query waterfall**: gabungkan dengan `Promise.all`, atau pakai **Postgres function (RPC)** agar banyak operasi = 1 round-trip. `select` kolom seperlunya.
5. **Akses DB via `supabase-js` (HTTP/PostgREST)** dari worker, bukan koneksi TCP Postgres mentah. Untuk driver langsung (migrasi/cron lokal) pakai **Supavisor pooler** (transaction mode).

### 12.4 Biaya & batas (tier gratis, ~5 klinik)
- Cloudflare Workers free: **100k request/hari** — lebih dari cukup.
- Supabase free: DB **500MB**, Storage **1GB**, cukup untuk puluhan klinik awal.
- Satu-satunya biaya: **domain** (sudah dimiliki). OTP pasien ditunda (lihat 3.4.2) supaya tidak ada biaya SMS.

### 12.5 Catatan & batas tier gratis (jujur)
- **Auto-pause Supabase free**: project di-pause bila **tidak ada aktivitas ~7 hari**. Dengan 5 klinik aktif harian biasanya aman. Untuk jaga-jaga (apalagi ada **data medis**), jadwalkan **export backup berkala** manual.
- **Backup terbatas** di free (tanpa PITR). Untuk produksi serius → **Supabase Pro ($25/bln)**.
- Naikkan ke tier berbayar hanya saat trafik/penghasilan menuntut — arsitektur tidak perlu diubah.

### 12.6 Rahasia/env
- `SUPABASE_SERVICE_ROLE_KEY` **server-only** (binding Worker / env Cloudflare yang tidak ter-expose ke client). Jangan pakai prefix `NEXT_PUBLIC_`.
- **Affiliator**: model komisi *recurring* (setiap renewal) vs *first-payment-only* — default sementara recurring
- **Affiliator**: apakah ada `commission_rate` default global selain yang di-custom per affiliator
- **Affiliator**: pembayaran komisi manual (super admin transfer lalu tandai `paid`) vs perlu integrasi payout otomatis nanti
- **Affiliator**: apakah affiliator boleh menentukan/mengusulkan harga langganan klinik yang dia bawa, atau harga tetap ditentukan super admin
