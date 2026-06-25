# SETUP — Stage 1 (Fondasi)

Panduan singkat menjalankan fondasi. Ikuti urut dari atas.

## 1. Buat project Supabase
1. Buka https://supabase.com → **New project**.
2. **Region: Singapore (ap-southeast-1)** — wajib, terdekat ke user Indonesia (CLAUDE.md §12.1).
3. Catat password database (disimpan baik-baik).

## 2. Jalankan SQL (urut!)
Buka **SQL Editor** di dashboard Supabase, jalankan **berurutan**:

1. `supabase/migrations/0001_schema.sql`  → tabel, index, FK
2. `supabase/migrations/0002_rls.sql`     → helper function, RLS, view publik
3. `supabase/migrations/0003_auth_and_cron.sql` → trigger sync auth + cron expired

> Jika langkah 3 error di `create extension pg_cron`: buka **Database → Extensions**,
> aktifkan **pg_cron** dari sana, lalu jalankan ulang file 0003.

## 3. Isi environment
1. Salin `.env.example` → `.env.local`.
2. Ambil nilai dari **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (**RAHASIA**, jangan dibagikan)
3. Isi juga `SEED_SUPERADMIN_EMAIL` & `SEED_SUPERADMIN_PASSWORD` untuk langkah 4.

## 4. Seed super admin pertama
Super admin tidak lewat UI signup (CLAUDE.md §9.2). Jalankan:

```bash
node --env-file=.env.local scripts/seed-super-admin.mjs
```

Akan muncul `✅ Super admin siap: <email>`. (Login dipakai setelah dashboard `/admin` dibuat di Stage 2.)

## 5. Jalankan dev server
```bash
npm run dev
```
Buka http://localhost:3000 — harus muncul halaman "Stage 1 — Fondasi siap ✓".

## 6. (Nanti) Deploy ke Cloudflare
Belum perlu sekarang. Saat siap:
```bash
npm run preview   # build + preview lokal di Workers runtime
npm run deploy    # build + deploy ke Cloudflare
```
Set secret di Cloudflare (jangan commit): `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`, dst.

---

## Struktur yang sudah dibuat di Stage 1
```
app/                         # Next.js App Router (placeholder home)
lib/supabase/
  client.ts                  # client browser (anon)
  server.ts                  # client server + sesi cookie (anon)
  admin.ts                   # client service-role (server-only, bypass RLS)
scripts/seed-super-admin.mjs # seed super admin pertama
supabase/migrations/         # 3 file SQL (schema, RLS, trigger+cron)
open-next.config.ts          # adapter Cloudflare
wrangler.jsonc               # konfigurasi Workers (smart placement)
.env.example                 # template environment
```

## Selanjutnya — Stage 2: Super Admin Panel
Form approval klinik, assign subdomain (validasi + reserved), kelola subscription manual, tambah klinik langsung.
