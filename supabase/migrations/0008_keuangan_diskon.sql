-- ============================================================
-- 0008_keuangan_diskon.sql  —  Modul Keuangan owner (buku kas) + Katalog Diskon
-- Jalankan SETELAH 0007. Mengadaptasi model "Villa Melting" ke multi-tenant klinik.
--
-- Konsep (lihat CLAUDE.md & app/owner/keuangan):
--  - `keuangan` = buku kas tunggal per klinik. Tiap baris: pemasukan (masuk) /
--    pengeluaran (keluar), berakun (Pendapatan Jasa, Beban Gaji, dst), dgn saldo
--    berjalan dihitung di aplikasi.
--  - PEMASUKAN OTOMATIS: setiap baris `payments` (pembayaran terkonfirmasi) memicu
--    trigger yang membuat baris keuangan `is_auto = true` berakun 'Pendapatan Jasa'.
--    Hapus payment → baris auto-nya ikut terhapus. Owner tetap bisa edit/hapus manual.
--  - PENGELUARAN & pemasukan lain DIINPUT MANUAL owner (is_auto = false).
--  - Laba Rugi & Laporan Tahunan dihitung dari buku kas ini.
--  - `discounts` = katalog diskon (persen/nominal) yang bisa dipakai admin saat invoice.
--
-- AMAN diulang (idempoten): if not exists / drop-if-exists.
-- ============================================================

-- ============================================
-- BUKU KAS (keuangan)
-- ============================================
create table if not exists keuangan (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  tanggal     date not null,
  keterangan  text not null,
  akun        text not null,                       -- 'Pendapatan Jasa', 'Beban Gaji', dst
  jenis       text not null check (jenis in ('masuk','keluar')),
  payment     text not null default 'non_tunai' check (payment in ('tunai','non_tunai')),
  jumlah      numeric(14,2) not null check (jumlah > 0),
  is_auto     boolean not null default false,      -- true = hasil sinkron dari payments
  booking_id  uuid references bookings(id) on delete set null,
  payment_id  uuid references payments(id) on delete cascade, -- baris auto ikut terhapus
  created_at  timestamptz default now()
);

create index if not exists idx_keuangan_clinic_id on keuangan(clinic_id);
create index if not exists idx_keuangan_clinic_tanggal on keuangan(clinic_id, tanggal);
create index if not exists idx_keuangan_payment_id on keuangan(payment_id);

-- ============================================
-- KATALOG DISKON (discounts)
-- ============================================
create table if not exists discounts (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('percent','nominal')),
  value       numeric(12,2) not null check (value >= 0),
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

create index if not exists idx_discounts_clinic_id on discounts(clinic_id);

-- ============================================
-- TRIGGER: sinkron payments -> keuangan (pemasukan otomatis)
-- ============================================
-- Saat baris payments masuk, buat baris keuangan 'Pendapatan Jasa' (masuk).
-- payment 'cash' -> tunai, selain itu -> non_tunai.
create or replace function sync_payment_to_keuangan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_patient text;
  v_keterangan text;
begin
  if new.amount is null or new.amount <= 0 then
    return new;
  end if;

  select b.booking_code, p.full_name
    into v_code, v_patient
  from bookings b
  left join patients p on p.id = b.patient_id
  where b.id = new.booking_id;

  v_keterangan := 'Pembayaran'
    || coalesce(' ' || v_code, '')
    || coalesce(' — ' || v_patient, '');

  insert into keuangan (clinic_id, tanggal, keterangan, akun, jenis, payment, jumlah, is_auto, booking_id, payment_id)
  values (
    new.clinic_id,
    coalesce(new.confirmed_at, new.created_at, now())::date,
    v_keterangan,
    'Pendapatan Jasa',
    'masuk',
    case when new.method = 'cash' then 'tunai' else 'non_tunai' end,
    new.amount,
    true,
    new.booking_id,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_payment_to_keuangan on payments;
create trigger trg_payment_to_keuangan
  after insert on payments
  for each row execute function sync_payment_to_keuangan();

-- ============================================
-- BACKFILL: payments lama yang belum punya baris keuangan auto
-- ============================================
insert into keuangan (clinic_id, tanggal, keterangan, akun, jenis, payment, jumlah, is_auto, booking_id, payment_id)
select
  pm.clinic_id,
  coalesce(pm.confirmed_at, pm.created_at, now())::date,
  'Pembayaran'
    || coalesce(' ' || b.booking_code, '')
    || coalesce(' — ' || pt.full_name, ''),
  'Pendapatan Jasa',
  'masuk',
  case when pm.method = 'cash' then 'tunai' else 'non_tunai' end,
  pm.amount,
  true,
  pm.booking_id,
  pm.id
from payments pm
left join bookings b on b.id = pm.booking_id
left join patients pt on pt.id = b.patient_id
where pm.amount > 0
  and not exists (select 1 from keuangan k where k.payment_id = pm.id);

-- ============================================
-- RLS
-- ============================================
alter table keuangan enable row level security;
alter table discounts enable row level security;

-- keuangan: hanya OWNER klinik (data finansial sensitif). Super admin baca.
drop policy if exists "owner_manage_keuangan" on keuangan;
create policy "owner_manage_keuangan" on keuangan
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'owner');

drop policy if exists "super_admin_read_keuangan" on keuangan;
create policy "super_admin_read_keuangan" on keuangan
  for select using ((select auth_user_role()) = 'super_admin');

-- discounts: owner & admin klinik kelola; publik/booking pakai via service role.
drop policy if exists "staff_manage_discounts" on discounts;
create policy "staff_manage_discounts" on discounts
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) in ('owner','admin'));
