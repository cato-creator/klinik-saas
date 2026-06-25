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
const clinicCfg = cfg?.clinic ?? {};

if (!dbUrl) die("config.supabase.dbUrl kosong.");
if (!supabaseUrl || !serviceKey) die("config.supabase.url / serviceRoleKey kosong.");
if (!owner.email || !owner.password) die("config.owner.email / password kosong.");
if (!clinicCfg.name || !clinicCfg.subdomain) die("config.clinic.name / subdomain kosong.");

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

// ============ 2. SEED KLINIK SIAP-PAKAI ============
// Produk self-hosted = SATU klinik yang sudah jadi. Buat: klinik (aktif) + owner
// (role owner) + langganan kekal (bayar-sekali, tak pernah expired) + landing
// default. TIDAK ada super_admin. Idempoten (aman diulang).
async function seedClinic() {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const disciplines = Array.isArray(clinicCfg.specializations) && clinicCfg.specializations.length
    ? clinicCfg.specializations
    : [clinicCfg.clinicType || "fisioterapi"];

  // 2a. Upsert klinik (unik per subdomain → idempoten).
  const { data: clinic, error: cErr } = await supabase
    .from("clinics")
    .upsert(
      {
        name: clinicCfg.name,
        subdomain: clinicCfg.subdomain,
        clinic_type: disciplines[0],
        specializations: disciplines,
        status: "active",
      },
      { onConflict: "subdomain" },
    )
    .select("id")
    .single();
  if (cErr || !clinic) die(`Gagal membuat klinik: ${cErr?.message ?? "unknown"}`);
  const clinicId = clinic.id;
  console.log(`   ✓ Klinik: ${clinicCfg.name} (${disciplines.join("+")})`);

  // 2b. Akun owner (role owner, terhubung ke klinik).
  const { data: created, error: uErr } = await supabase.auth.admin.createUser({
    email: owner.email,
    password: owner.password,
    email_confirm: true,
    user_metadata: { full_name: owner.name || owner.email, role: "owner", clinic_id: clinicId },
  });
  let userId = created?.user?.id;
  if (uErr) {
    if (!/already.*registered|exists/i.test(uErr.message)) die(`Gagal membuat owner: ${uErr.message}`);
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list?.users?.find((u) => u.email?.toLowerCase() === owner.email.toLowerCase())?.id;
    if (userId) await supabase.auth.admin.updateUserById(userId, { password: owner.password });
  }
  if (userId) {
    const { error: upErr } = await supabase
      .from("users")
      .update({ role: "owner", clinic_id: clinicId, status: "active", full_name: owner.name || owner.email })
      .eq("id", userId);
    if (upErr) die(`Gagal set owner: ${upErr.message}`);
  }
  console.log(`   ✓ Owner: ${owner.email}`);

  // 2c. Langganan kekal (bayar-sekali) — agar tak pernah terkunci cron expired.
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .maybeSingle();
  if (!existingSub) {
    const { error: sErr } = await supabase.from("subscriptions").insert({
      clinic_id: clinicId,
      plan_type: "1_year",
      amount: 0,
      started_at: new Date().toISOString(),
      expires_at: "2099-12-31T00:00:00Z",
      status: "active",
      notes: "Self-hosted (bayar sekali) — langganan kekal.",
    });
    if (sErr) die(`Gagal membuat langganan: ${sErr.message}`);
  }
  console.log("   ✓ Langganan kekal");

  // 2d. Landing default (idempoten per clinic_id).
  const { error: lErr } = await supabase.from("landing_page_content").upsert(
    { clinic_id: clinicId, hero_title: clinicCfg.name },
    { onConflict: "clinic_id" },
  );
  if (lErr) console.warn(`⚠️  landing default gagal (tak fatal): ${lErr.message}`);

  console.log(`✅ Klinik siap-pakai. Owner login di domain klinik → dashboard owner.`);
}

console.log(`▶ Provisioning DB untuk: ${clinicCfg.name ?? "(klinik)"}`);
await runMigrations();
await seedClinic();
console.log("🎉 Selesai. Lanjut ke langkah deploy Cloudflare di panduan (DEPLOY.md).");
