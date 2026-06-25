// ============================================================
// ci-provision.mjs — Fase 2B: orkestrator provisioning di runner GitLab.
//
// Dipanggil oleh .gitlab-ci.yml. Membaca variabel pipeline (env):
//   CLINIC_ID, JOB_TOKEN, PANEL_URL        (dikirim panel saat trigger)
//   DEPLOY_CLOUDFLARE=1                     (OPSIONAL — set di CI/CD variables
//                                            saat tahap Cloudflare sudah siap diuji)
//
// Alur:
//   1. Ambil config terdekripsi dari panel (token job)  → tulis 2 file
//   2. Migrasi DB + seed akun (scripts/provision-db.mjs) → lapor 2 langkah
//   3. (opsional) Build + deploy Cloudflare ke akun klinik → lapor langkah
//   4. Lapor hasil akhir job
//
// Catatan: langkah 1–2 adalah inti yang sudah pasti jalan. Langkah 3 default MATI
// (DEPLOY_CLOUDFLARE belum diset) karena per-akun Cloudflare perlu diuji dulu.
// ============================================================
import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const { CLINIC_ID, JOB_TOKEN, PANEL_URL } = process.env;
const DEPLOY_CF = process.env.DEPLOY_CLOUDFLARE === "1";

if (!CLINIC_ID || !JOB_TOKEN || !PANEL_URL) {
  console.error("❌ CLINIC_ID / JOB_TOKEN / PANEL_URL belum ada di environment.");
  process.exit(1);
}

async function reportStep(stepKey, status, extra = {}) {
  try {
    const res = await fetch(`${PANEL_URL}/api/self-hosted/ci/step`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clinicId: CLINIC_ID, jobToken: JOB_TOKEN, stepKey, status, ...extra }),
    });
    if (!res.ok) console.warn(`⚠️  lapor langkah ${stepKey} gagal: HTTP ${res.status}`);
  } catch (e) {
    console.warn(`⚠️  lapor langkah ${stepKey} error: ${e.message}`);
  }
}

// Jalankan perintah, kembalikan true bila exit 0. Stdio diwariskan agar log tampil di job.
function run(cmd, args, env = {}) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  return r.status === 0;
}

async function fail(stepKey, msg) {
  console.error(`❌ ${msg}`);
  await reportStep(stepKey, "failed", { jobStatus: "failed", notes: msg.slice(0, 480) });
  process.exit(1);
}

// ---------- 1. Ambil config ----------
console.log("▶ Mengambil config dari panel…");
let cfg;
{
  const res = await fetch(`${PANEL_URL}/api/self-hosted/ci/config`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clinicId: CLINIC_ID, jobToken: JOB_TOKEN }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    await fail("supabase_migrated", `Ambil config gagal (HTTP ${res.status}): ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data.missing?.length) {
    await fail("supabase_migrated", `Data klinik belum lengkap: ${data.missing.join(", ")}`);
  }
  await writeFile("provision.config.json", data.configJson, "utf8");
  await writeFile("wrangler.selfhosted.jsonc", data.wranglerJson, "utf8");
  cfg = JSON.parse(data.configJson);
  console.log("✓ Config diterima & file ditulis.");
}

// ---------- 2. Migrasi DB + seed akun ----------
if (!run("node", ["scripts/provision-db.mjs", "provision.config.json"])) {
  await fail("supabase_migrated", "provision-db.mjs gagal (migrasi/seed).");
}
await reportStep("supabase_migrated", "done");
await reportStep("owner_seeded", "done");
console.log("✓ DB & akun siap.");

// ---------- 3. (opsional) Deploy Cloudflare ----------
if (!DEPLOY_CF) {
  console.log("\nℹ️  DEPLOY_CLOUDFLARE belum diaktifkan — tahap Cloudflare dilewati.");
  console.log("   Selesaikan deploy Cloudflare manual via DEPLOY.md, atau set CI/CD variable");
  console.log("   DEPLOY_CLOUDFLARE=1 di GitLab saat sudah siap diuji.");
  await reportStep("smoke_test", "pending", { jobStatus: "succeeded" });
  console.log("\n🎉 Provisioning DB selesai.");
  process.exit(0);
}

const cf = cfg.cloudflare;
const cfEnv = { CLOUDFLARE_API_TOKEN: cf.apiToken, CLOUDFLARE_ACCOUNT_ID: cf.accountId };

// 3a. Pastikan KV namespace ada di akun klinik, ambil id-nya.
console.log("\n▶ Menyiapkan KV namespace…");
let kvId = "";
{
  const list = spawnSync("npx", ["wrangler", "kv", "namespace", "list"], {
    shell: true,
    encoding: "utf8",
    env: { ...process.env, ...cfEnv },
  });
  try {
    const arr = JSON.parse(list.stdout || "[]");
    kvId = arr.find((n) => n.title?.endsWith("klinik_cache"))?.id ?? "";
  } catch {
    /* output bukan JSON → buat baru */
  }
  if (!kvId) {
    const create = spawnSync("npx", ["wrangler", "kv", "namespace", "create", "klinik_cache"], {
      shell: true,
      encoding: "utf8",
      env: { ...process.env, ...cfEnv },
    });
    console.log(create.stdout || create.stderr);
    kvId = (create.stdout?.match(/id\s*=\s*"([a-f0-9]+)"/i) ?? [])[1] ?? "";
  }
}
if (!kvId) await fail("pages_created", "Gagal membuat/menemukan KV namespace di akun klinik.");

// Tempel id KV ke wrangler config.
const wranglerRaw = readFileSync("wrangler.selfhosted.jsonc", "utf8");
await writeFile("wrangler.selfhosted.jsonc", wranglerRaw.replace("__FILL_KV_ID__", kvId), "utf8");

// 3b. Build (NEXT_PUBLIC_* di-bake) lalu deploy ke akun klinik.
const buildEnv = {
  ...cfEnv,
  NEXT_PUBLIC_SUPABASE_URL: cfg.supabase.url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: cfg.supabase.anonKey,
  NEXT_PUBLIC_ROOT_DOMAIN: cfg.rootDomain,
};
if (!run("npx", ["opennextjs-cloudflare", "build"], buildEnv)) {
  await fail("pages_created", "Build OpenNext gagal.");
}
if (
  !run(
    "npx",
    ["opennextjs-cloudflare", "deploy", "--", "--config", "wrangler.selfhosted.jsonc"],
    buildEnv,
  )
) {
  await fail("pages_created", "Deploy Cloudflare gagal.");
}
await reportStep("pages_created", "done");

// 3c. Set secret runtime worker klinik.
const worker = cf.workerName;
const secretArgs = (name) => ["wrangler", "secret", "put", name, "--name", worker, "--config", "wrangler.selfhosted.jsonc"];
function putSecret(name, value) {
  const r = spawnSync("npx", secretArgs(name), {
    shell: true,
    input: `${value}\n`,
    encoding: "utf8",
    env: { ...process.env, ...cfEnv },
  });
  if (r.status !== 0) console.warn(`⚠️  set secret ${name} gagal: ${r.stderr ?? ""}`);
}
putSecret("SUPABASE_SERVICE_ROLE_KEY", cfg.supabase.serviceRoleKey);
putSecret("NEXT_PUBLIC_SUPABASE_URL", cfg.supabase.url);
putSecret("NEXT_PUBLIC_SUPABASE_ANON_KEY", cfg.supabase.anonKey);
putSecret("NEXT_PUBLIC_ROOT_DOMAIN", cfg.rootDomain);
await reportStep("env_set", "done");

// 3d. DNS & smoke test tetap manual.
await reportStep("dns_ok", "pending");
await reportStep("smoke_test", "pending", { jobStatus: "succeeded" });
console.log("\n🎉 Deploy otomatis selesai. Tinggal hubungkan DNS & smoke test (manual).");
