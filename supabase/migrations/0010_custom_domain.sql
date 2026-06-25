-- ============================================================
-- 0010_custom_domain.sql  (Stage 8 — Custom Domain tier premium)
-- Melengkapi tabel `domains` agar owner klinik bisa memasang domain sendiri.
-- Tabel `domains` & RLS-nya sudah dibuat di 0001/0002; di sini hanya menambah
-- kolom pendukung verifikasi + default token + index. Jalankan SETELAH 0009.
-- Alur: owner tambah domain -> arahkan DNS (CNAME) -> klik Verifikasi
-- (server cek via DNS-over-HTTPS) -> verified=true -> middleware resolusi host.
-- ============================================================

-- Token verifikasi otomatis terisi saat owner menambahkan domain (dipakai utk
-- record TXT opsional / jejak). gen_random_uuid tersedia (pgcrypto/pg13+).
alter table domains
  alter column verification_token set default replace(gen_random_uuid()::text, '-', '');

-- Kapan domain terverifikasi (untuk audit & tampilan owner).
alter table domains add column if not exists verified_at timestamptz;

-- ID custom hostname di Cloudflare for SaaS (dipakai saat verifikasi ulang &
-- hapus domain lewat API). Null bila pendaftaran ke Cloudflare belum dilakukan.
alter table domains add column if not exists cf_hostname_id text;

-- Status SSL/hostname terakhir dari Cloudflare (informasi utk owner:
-- 'pending' | 'pending_validation' | 'active' | 'error' dst).
alter table domains add column if not exists cf_status text;

-- Lookup host -> klinik di middleware harus cepat & hanya domain terverifikasi.
create index if not exists idx_domains_custom_domain on domains(custom_domain);
create index if not exists idx_domains_clinic_id on domains(clinic_id);

-- Simpan domain selalu lowercase (host header selalu di-lowercase saat resolusi).
-- Constraint ringan agar tidak ada huruf besar yang lolos dari sisi DB.
alter table domains drop constraint if exists domains_custom_domain_lowercase;
alter table domains add constraint domains_custom_domain_lowercase
  check (custom_domain = lower(custom_domain));
