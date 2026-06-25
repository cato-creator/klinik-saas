-- ============================================================
-- 0014_inventory.sql  —  Inventory Barang Habis Pakai (consumables)
-- Jalankan SETELAH 0013.
--
-- Konsep:
--  - `inventory_items` = catatan pembelian barang habis pakai per klinik
--    (mis. handscoon, kapas, gel USG). Tiap pembelian = 1 baris.
--  - SETIAP pembelian OTOMATIS jadi PENGELUARAN di buku kas (`keuangan`):
--    trigger membuat baris keuangan `jenis='keluar'`, akun 'Beban Perlengkapan',
--    is_auto=true, ditautkan via keuangan.inventory_id.
--  - Edit pembelian → baris keuangan ikut diperbarui. Hapus pembelian →
--    baris keuangan ikut terhapus (FK on delete cascade).
--
-- AMAN diulang (idempoten): if not exists / drop-if-exists / create or replace.
-- ============================================================

-- ============================================
-- INVENTORY BARANG HABIS PAKAI
-- ============================================
create table if not exists inventory_items (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  name         text not null,
  quantity     numeric(12,2) not null default 1 check (quantity > 0),
  unit         text,                                   -- satuan: pcs, box, botol, dst
  unit_price   numeric(14,2) not null default 0 check (unit_price >= 0),
  total_cost   numeric(14,2) not null check (total_cost > 0),  -- = quantity * unit_price
  payment      text not null default 'non_tunai' check (payment in ('tunai','non_tunai')),
  purchased_at date not null default current_date,
  notes        text,
  created_at   timestamptz default now()
);

create index if not exists idx_inventory_clinic_id on inventory_items(clinic_id);
create index if not exists idx_inventory_clinic_tanggal on inventory_items(clinic_id, purchased_at);

-- Tautan baris keuangan -> pembelian inventory (baris auto ikut terhapus saat
-- pembelian dihapus).
alter table keuangan
  add column if not exists inventory_id uuid references inventory_items(id) on delete cascade;

create index if not exists idx_keuangan_inventory_id on keuangan(inventory_id);

-- ============================================
-- TRIGGER: sinkron inventory_items -> keuangan (pengeluaran otomatis)
-- ============================================
create or replace function sync_inventory_to_keuangan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ket text;
begin
  -- "Nama (5 pcs)" — jumlah & satuan ditampilkan bila ada.
  v_ket := new.name
    || ' (' || trim(to_char(new.quantity, 'FM999999990.##'))
    || coalesce(' ' || new.unit, '') || ')';

  if tg_op = 'INSERT' then
    insert into keuangan (clinic_id, tanggal, keterangan, akun, jenis, payment, jumlah, is_auto, inventory_id)
    values (new.clinic_id, new.purchased_at, v_ket, 'Beban Perlengkapan', 'keluar', new.payment, new.total_cost, true, new.id);
  elsif tg_op = 'UPDATE' then
    update keuangan
       set tanggal    = new.purchased_at,
           keterangan = v_ket,
           payment    = new.payment,
           jumlah     = new.total_cost
     where inventory_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_inventory_to_keuangan on inventory_items;
create trigger trg_inventory_to_keuangan
  after insert or update on inventory_items
  for each row execute function sync_inventory_to_keuangan();

-- ============================================
-- RLS — hanya OWNER klinik (data finansial). Super admin baca.
-- ============================================
alter table inventory_items enable row level security;

drop policy if exists "owner_manage_inventory" on inventory_items;
create policy "owner_manage_inventory" on inventory_items
  for all using (clinic_id = (select auth_user_clinic_id()) and (select auth_user_role()) = 'owner');

drop policy if exists "super_admin_read_inventory" on inventory_items;
create policy "super_admin_read_inventory" on inventory_items
  for select using ((select auth_user_role()) = 'super_admin');
