# DEPLOY — Cloudflare Workers (OpenNext)

Aplikasi sudah lolos `opennextjs-cloudflare build` (bundel Worker tergenerate di `.open-next/`).
Tinggal autentikasi Cloudflare + set secret, lalu deploy.

## Yang dibutuhkan dari kamu
1. **Cloudflare API Token** dengan izin **"Edit Cloudflare Workers"**
   (Dashboard Cloudflare → My Profile → API Tokens → Create Token → template *Edit Cloudflare Workers*).
2. **Account ID** Cloudflare (Dashboard → Workers & Pages → ada di kanan). Opsional bila token hanya 1 akun.

## Langkah deploy
```bash
# 1. set kredensial (sesi terminal)
$env:CLOUDFLARE_API_TOKEN="<token>"
$env:CLOUDFLARE_ACCOUNT_ID="<account_id>"   # opsional

# 2. set secret service-role di Worker (dibaca server saat runtime)
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
#   -> tempel nilai service_role key saat diminta

# 3. build + deploy
npm run deploy
```

Hasil: app live di `https://klinik-saas.<subdomain>.workers.dev`.

## Status: SUDAH LIVE
- URL: **https://klinik-saas.zakaainun.workers.dev**
- Secret `SUPABASE_SERVICE_ROLE_KEY` sudah di-set di Worker.

## ⚠️ Build harus pakai Webpack (bukan Turbopack)
Script `build` di `package.json` = `next build --webpack`. **Jangan** ubah ke Turbopack:
Next 16 default-nya Turbopack, dan bundel server Turbopack bikin OpenNext error runtime
`ChunkLoadError: Failed to load chunk server/chunks/ssr/...` (semua route balas 500).
Dev (`npm run dev`) tetap Turbopack — tidak masalah.

## Catatan penting
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` **di-inline saat build** dari `.env.local`
  (untuk client maupun server), jadi tidak perlu di-set ulang di Cloudflare.
- `SUPABASE_SERVICE_ROLE_KEY` **TIDAK** di-inline (rahasia) — wajib di-set via `wrangler secret put`.
- Custom domain `platformlo.com` + wildcard subdomain = Stage 8 (Cloudflare for SaaS). Untuk sekarang
  cukup workers.dev.
- Supabase Auth: tambahkan URL workers.dev ke **Auth → URL Configuration → Redirect URLs** bila perlu.
