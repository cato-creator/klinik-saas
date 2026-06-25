// ============================================================
// provision-db.mjs — Fase 2A: provisioning DB klinik self-hosted.
//
// Menerapkan SEMUA migrasi membership (supabase/migrations/*.sql) ke project
// Supabase MILIK KLINIK, lalu menyeed satu akun login awal. IDEMPOTEN: migrasi
// yang sudah pernah jalan dilacak di tabel `_provision_applied` dan dilewati.
//
// Cara jalan (dari root repo, setelah `npm install`):
//   node scripts/provision-db.mjs provision.config.json
//
// `provision.config.json` digenerate dari panel super admin
// (Self-Hosted → detail klinik → Paket Deploy → tab "config"). Berisi SECRET —
// jangan commit, hapus setelah selesai.
// ============================================================
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const MIGRATIONS_DIR = path.resolve("supabase/migrations");

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

const configPath = process.argv[2];
if (!configPath) die("Pakai: node scripts/provision-db.mjs <provision.config.json>");

let cfg;
try {
  cfg = JSON.parse(await readFile(path.resolve(configPath), "utf8"));
} catch (e) {
  die(`Gagal membaca config: ${e.message}`);
}

const dbUrl = cfg?.supabase?.dbUrl;
const supabaseUrl = cfg?.supabase?.url;
const serviceKey = cfg?.supabase?.serviceRoleKey;
const owner = cfg?.owner ?? {};
const seedRole = cfg?.seedRole === "owner" ? "owner" : "super_admin";

if (!dbUrl) die("config.supabase.dbUrl kosong.");
if (!supabaseUrl || !serviceKey) die("config.supabase.url / serviceRoleKey kosong.");
if (!owner.email || !owner.password) die("config.owner.email / password kosong.");

// ============ 1. MIGRASI DB ============
async function runMigrations() {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 0001_… < 0002_… (urutan leksikografis sesuai penomoran)
  if (files.length === 0) die(`Tidak ada migrasi di ${MIGRATIONS_DIR}`);

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // Supabase memakai TLS
  });

  try {
    await client.connect();
  } catch (e) {
    die(
      `Gagal connect ke DB klinik: ${e.message}\n` +
        "   Bila jaringanmu tak punya IPv6, ganti config.supabase.dbUrl dengan\n" +
        "   Session Pooler (IPv4) dari Supabase → Project Settings → Database.",
    );
  }

  await client.query(
    "create table if not exists _provision_applied (version text primary key, applied_at timestamptz default now())",
  );
  const { rows } = await client.query("select version from _provision_applied");
  const applied = new Set(rows.map((r) => r.version));

  let ran = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) {
      console.log(`   ↷ lewati ${file} (sudah pernah)`);
      continue;
    }
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _provision_applied(version) values ($1)", [version]);
      await client.query("commit");
      console.log(`   ✓ ${file}`);
      ran++;
    } catch (e) {
      await client.query("rollback").catch(() => {});
      await client.end().catch(() => {});
      die(`Migrasi ${file} gagal: ${e.message}`);
    }
  }
  await client.end();
  console.log(`✅ Migrasi selesai (${ran} baru, ${files.length - ran} dilewati).`);
}

// ============ 2. SEED AKUN LOGIN AWAL ============
async function seedAccount() {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email: owner.email,
    password: owner.password,
    email_confirm: true,
    user_metadata: { full_name: owner.name || owner.email, role: seedRole },
  });

  let userId = data?.user?.id;
  if (error) {
    if (!/already.*registered|exists/i.test(error.message)) {
      die(`Gagal membuat akun: ${error.message}`);
    }
    console.warn("⚠️  Akun sudah ada, memastikan role & reset password…");
    // Ambil id user yang sudah ada lewat listUsers (email match).
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list?.users?.find((u) => u.email?.toLowerCase() === owner.email.toLowerCase())?.id;
    // Reset password ke nilai awal yang ditampilkan ke super admin, agar selalu cocok.
    if (userId) {
      await supabase.auth.admin.updateUserById(userId, { password: owner.password });
    }
  }

  if (userId) {
    const { error: upErr } = await supabase
      .from("users")
      .update({
        role: seedRole,
        clinic_id: null,
        status: "active",
        full_name: owner.name || owner.email,
      })
      .eq("id", userId);
    if (upErr) die(`Gagal set role ${seedRole}: ${upErr.message}`);
  }
  console.log(`✅ Akun siap: ${owner.email} (role ${seedRole}).`);
}

console.log(`▶ Provisioning DB untuk: ${cfg.clinicName ?? cfg.clinicId ?? "(klinik)"}`);
await runMigrations();
await seedAccount();
console.log("🎉 Selesai. Lanjut ke langkah deploy Cloudflare di panduan (DEPLOY.md).");
