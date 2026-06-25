// Perakit "Paket Deploy" semi-otomatis (Fase 2A) untuk klinik self-hosted.
//
// FUNGSI MURNI: tanpa filesystem & tanpa network → aman dipanggil di Cloudflare
// Worker (server action). Hanya mengubah data klinik + secret yang sudah
// didekripsi menjadi artefak teks (config JSON + runbook + wrangler config) yang
// dijalankan operator di mesinnya sendiri dari root repo.
//
// Tujuan Fase 2A (semi → penuh): mengotomatiskan bagian MEKANIS provisioning
// (migrasi DB + seed akun + perintah deploy) supaya operator tinggal copy-paste,
// SEBELUM diubah jadi pipeline GitHub Actions satu-klik di Fase 2B.

import type { SelfHostedClinic } from "./self-hosted";

export type DeploySecrets = {
  supabase_service_role: string;
  supabase_db_password: string;
  cloudflare_token: string;
};

export type DeployBundle = {
  /** Daftar field/secret yang masih kosong — jika tidak kosong, paket tidak lengkap. */
  missing: string[];
  /** Nama worker Cloudflare untuk klinik ini (turunan dari domain/nama). */
  workerName: string;
  /** Isi file provision.config.json (berisi SECRET — perlakukan rahasia). */
  configJson: string;
  /** Isi file wrangler.selfhosted.jsonc khusus akun Cloudflare klinik. */
  wranglerJson: string;
  /** Runbook langkah-demi-langkah (markdown) dengan semua nilai sudah terisi. */
  runbook: string;
};

// Ambil project ref Supabase: pakai kolom eksplisit, atau turunkan dari host URL
// (https://<ref>.supabase.co → <ref>).
function deriveProjectRef(clinic: SelfHostedClinic): string | null {
  if (clinic.supabase_project_ref) return clinic.supabase_project_ref.trim();
  const url = clinic.supabase_url?.trim();
  if (!url) return null;
  const m = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

// Slug aman untuk nama worker Cloudflare: [a-z0-9-], 1–52 char, tak diawali/diakhiri '-'.
function slugifyWorkerName(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52)
    .replace(/-+$/g, "");
  return s || "klinik";
}

// Bangun connection string Postgres (DIRECT, port 5432 — mendukung DDL/migrasi).
// Catatan: koneksi direct `db.<ref>.supabase.co` kini IPv6-only di Supabase. Bila
// jaringan operator tak punya IPv6, runbook menyuruh ganti dengan Session Pooler
// (IPv4) dari dashboard Supabase. Password di-encode agar karakter spesial aman.
function buildDbUrl(ref: string, password: string): string {
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

export type BuildBundleInput = {
  clinic: SelfHostedClinic;
  secrets: DeploySecrets;
  /** Password awal akun admin yang di-seed (digenerate di server, ditampilkan sekali). */
  seedPassword: string;
  /** Role akun yang di-seed di instance klinik. Default super_admin (lihat runbook). */
  seedRole?: "super_admin" | "owner";
};

export function buildDeployBundle(input: BuildBundleInput): DeployBundle {
  const { clinic, secrets, seedPassword } = input;
  const seedRole = input.seedRole ?? "super_admin";

  const ref = deriveProjectRef(clinic);
  const rootDomain = clinic.target_domain?.trim() || null;
  const workerName = slugifyWorkerName(
    clinic.cloudflare_pages_project || rootDomain || clinic.name,
  );

  // Validasi kelengkapan — sebut field yang kosong agar operator tahu apa yang kurang.
  const missing: string[] = [];
  if (!ref) missing.push("Supabase URL / project ref");
  if (!clinic.supabase_anon_key) missing.push("Supabase anon key");
  if (!secrets.supabase_service_role) missing.push("Secret: Supabase service_role");
  if (!secrets.supabase_db_password) missing.push("Secret: Password database Supabase");
  if (!secrets.cloudflare_token) missing.push("Secret: Cloudflare API token");
  if (!clinic.cloudflare_account_id) missing.push("Cloudflare account ID");
  if (!rootDomain) missing.push("Domain tujuan (target_domain)");
  if (!clinic.owner_email) missing.push("Email owner (untuk akun login)");

  const dbUrl = ref ? buildDbUrl(ref, secrets.supabase_db_password) : "";

  const config = {
    clinicId: clinic.id,
    clinicName: clinic.name,
    targetDomain: rootDomain,
    rootDomain,
    seedRole,
    owner: {
      email: clinic.owner_email,
      name: clinic.owner_name || clinic.name,
      password: seedPassword,
    },
    supabase: {
      url: clinic.supabase_url,
      projectRef: ref,
      anonKey: clinic.supabase_anon_key,
      serviceRoleKey: secrets.supabase_service_role,
      dbUrl,
    },
    cloudflare: {
      accountId: clinic.cloudflare_account_id,
      apiToken: secrets.cloudflare_token,
      workerName,
    },
  };
  const configJson = JSON.stringify(config, null, 2);

  // wrangler khusus klinik: account_id mereka, nama worker mereka, TANPA KV id kita.
  // KV namespace dibuat di akun mereka (lihat runbook) lalu id-nya ditempel di sini.
  const wrangler = {
    $schema: "node_modules/wrangler/config-schema.json",
    name: workerName,
    main: ".open-next/worker.js",
    compatibility_date: "2025-03-25",
    compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
    account_id: clinic.cloudflare_account_id,
    assets: { directory: ".open-next/assets", binding: "ASSETS" },
    placement: { mode: "smart" },
    // Ganti __FILL_KV_ID__ dengan id namespace hasil `wrangler kv namespace create klinik_cache`.
    kv_namespaces: [{ binding: "NEXT_INC_CACHE_KV", id: "__FILL_KV_ID__" }],
    vars: {},
  };
  const wranglerJson = JSON.stringify(wrangler, null, 2);

  const runbook = buildRunbook({ clinic, workerName, rootDomain, missing });

  return { missing, workerName, configJson, wranglerJson, runbook };
}

function buildRunbook(args: {
  clinic: SelfHostedClinic;
  workerName: string;
  rootDomain: string | null;
  missing: string[];
}): string {
  const { clinic, workerName, rootDomain } = args;
  const domain = rootDomain ?? "<domain-klinik>";
  const incomplete =
    args.missing.length > 0
      ? `> ⚠️ **PAKET BELUM LENGKAP.** Lengkapi dulu di panel: ${args.missing.join(", ")}.\n\n`
      : "";

  return `# Paket Deploy — ${clinic.name}

${incomplete}Jalankan SEMUA langkah di bawah dari root repo (folder yang ada \`package.json\`-nya),
di mesin yang sudah \`npm install\`. Paket ini sekali pakai per klinik.

> 🔒 File \`provision.config.json\` berisi SECRET (service_role, password DB, token
> Cloudflare). Jangan commit, jangan kirim lewat chat. Hapus setelah selesai.

---

## 0. Simpan dua file paket
1. Simpan isi tab **config** sebagai \`provision.config.json\` di root repo.
2. Simpan isi tab **wrangler** sebagai \`wrangler.selfhosted.jsonc\` di root repo.

## 1. Migrasi DB + seed akun  →  checklist: \`supabase_migrated\`, \`owner_seeded\`
Jalankan skrip provisioning DB (idempoten — aman diulang):

\`\`\`bash
node scripts/provision-db.mjs provision.config.json
\`\`\`

Skrip ini: menerapkan semua migrasi \`supabase/migrations/*.sql\` ke Supabase klinik,
lalu membuat akun login awal. Bila jaringanmu tak punya IPv6 dan langkah migrasi
gagal connect, buka Supabase mereka → **Project Settings → Database → Connection
string → Session pooler**, salin URL-nya, dan ganti \`supabase.dbUrl\` di
\`provision.config.json\`, lalu ulangi.

## 2. Siapkan cache KV di akun Cloudflare klinik  →  bagian dari \`env_set\`
\`\`\`bash
export CLOUDFLARE_API_TOKEN="<token Cloudflare klinik (lihat config)>"
export CLOUDFLARE_ACCOUNT_ID="${(clinic.cloudflare_account_id ?? "<account-id>")}"
npx wrangler kv namespace create klinik_cache
\`\`\`
Salin \`id\` yang dikembalikan, tempel menggantikan \`__FILL_KV_ID__\` di
\`wrangler.selfhosted.jsonc\`.

## 3. Build & deploy ke Cloudflare klinik  →  checklist: \`pages_created\`
\`\`\`bash
# NEXT_PUBLIC_* di-bake saat build → harus pakai nilai milik KLINIK:
export NEXT_PUBLIC_SUPABASE_URL="${clinic.supabase_url ?? "<supabase-url>"}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key (lihat config)>"
export NEXT_PUBLIC_ROOT_DOMAIN="${domain}"

npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy -- --config wrangler.selfhosted.jsonc
\`\`\`
(Worker akan bernama **${workerName}** di akun mereka.)

## 4. Set secret runtime worker klinik  →  checklist: \`env_set\`
\`\`\`bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name ${workerName} --config wrangler.selfhosted.jsonc
wrangler secret put NEXT_PUBLIC_SUPABASE_URL  --name ${workerName} --config wrangler.selfhosted.jsonc
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --name ${workerName} --config wrangler.selfhosted.jsonc
wrangler secret put NEXT_PUBLIC_ROOT_DOMAIN --name ${workerName} --config wrangler.selfhosted.jsonc
# Bila klinik pakai upload foto (Cloudinary), set juga: CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET
\`\`\`
Nilainya ada di \`provision.config.json\`.

## 5. Hubungkan domain  →  checklist: \`dns_ok\`  (MANUAL di dashboard)
Di dashboard Cloudflare klinik: tambahkan **Workers Route** \`${domain}/*\` dan
\`*.${domain}/*\` ke worker **${workerName}**, lalu pasang DNS (apex + \`*\` wildcard
proxied). Tunggu SSL hijau.

## 6. Smoke test  →  checklist: \`smoke_test\`  (MANUAL)
Buka \`https://${domain}\`, login di \`/admin\` pakai email owner + password awal
(lihat config), buat data klinik via wizard, coba 1 booking. Kalau semua jalan →
tandai semua langkah \`done\` di panel & ubah status provisioning jadi **live**.

---
**Akun login awal:** email = \`${clinic.owner_email ?? "<email>"}\` · password = lihat \`owner.password\` di config.
Catatan role: akun di-seed sebagai \`super_admin\` di instance milik mereka sendiri,
supaya bisa membuat & mengelola klinik lewat alur \`/admin\` yang sudah ada.
`;
}
