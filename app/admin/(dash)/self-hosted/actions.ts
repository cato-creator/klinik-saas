"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSuperAdmin } from "@/lib/admin/guard";
import { createControlPlaneClient } from "@/lib/controlplane/client";
import { sealSecret, openSecret } from "@/lib/controlplane/crypto";
import { sanitizeSpecializations } from "@/lib/disciplines";
import {
  logSelfHostedAudit,
  PROVISIONING_STEPS,
  type SecretType,
} from "@/lib/controlplane/self-hosted";
import { assembleBundleForClinic } from "@/lib/controlplane/provision";
import { generateSeedPassword } from "@/lib/controlplane/deploy-bundle";
import { createDeployJob } from "@/lib/controlplane/deploy-jobs";
import { triggerPipeline } from "@/lib/controlplane/gitlab";
import { triggerWorkflow, isGitHubConfigured } from "@/lib/controlplane/github";

export type ActionResult = { ok: boolean; error?: string; value?: string; redirectUrl?: string };

const SECRET_TYPES = new Set<SecretType>([
  "supabase_service_role",
  "supabase_db_password",
  "cloudflare_token",
]);
const PROV_STATUS = new Set(["draft", "provisioning", "live", "suspended", "failed"]);

// Identitas super admin pelaku (id + email) untuk audit. Auth tetap di project
// membership; email diambil dari sana.
async function actor(): Promise<{ id: string; email: string | null }> {
  const id = await assertSuperAdmin();
  let email: string | null = null;
  try {
    const mdb = createAdminClient();
    const { data } = await mdb.from("users").select("email").eq("id", id).maybeSingle();
    email = (data?.email as string | undefined) ?? null;
  } catch {
    /* email opsional untuk audit */
  }
  return { id, email };
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("cf-connecting-ip") ?? null;
}

// Field non-rahasia yang dibaca dari form (dipakai create & update).
function readInfraFields(formData: FormData) {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  // Multi-disiplin: checkbox name="specializations" → getAll. Tipe utama (template
  // default) = disiplin pertama yang dipilih (urut registry via sanitize).
  const specializations = sanitizeSpecializations(formData.getAll("specializations").map(String));
  return {
    name: str("name"),
    clinic_type: specializations[0] ?? "",
    specializations,
    owner_name: str("owner_name") || null,
    owner_email: str("owner_email").toLowerCase() || null,
    owner_phone: str("owner_phone") || null,
    target_domain: str("target_domain").toLowerCase() || null,
    supabase_url: str("supabase_url") || null,
    supabase_project_ref: str("supabase_project_ref") || null,
    supabase_anon_key: str("supabase_anon_key") || null,
    supabase_pooler_url: str("supabase_pooler_url") || null,
    cloudflare_account_id: str("cloudflare_account_id") || null,
    cloudflare_pages_project: str("cloudflare_pages_project") || null,
    license_status: str("license_status") || "active",
    provisioning_status: str("provisioning_status") || "draft",
    notes: str("notes") || null,
  };
}

// ============ TAMBAH KLINIK SELF-HOSTED ============
export async function createSelfHostedClinic(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const me = await actor();
  const f = readInfraFields(formData);

  if (f.name.length < 2) return { ok: false, error: "Nama klinik wajib diisi." };
  if (f.specializations.length === 0)
    return { ok: false, error: "Pilih minimal satu layanan klinik (Fisio / OT / TW)." };
  if (f.owner_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.owner_email))
    return { ok: false, error: "Email owner tidak valid." };

  const db = createControlPlaneClient();
  const { data: clinic, error } = await db
    .from("selfhosted_clinics")
    .insert({ ...f, created_by: me.id })
    .select("id")
    .single();

  if (error || !clinic) {
    return { ok: false, error: `Gagal membuat klinik: ${error?.message ?? "unknown"}` };
  }

  // Buat baris checklist (semua pending) agar detail langsung punya langkah.
  await db.from("selfhosted_provisioning_steps").insert(
    PROVISIONING_STEPS.map((s) => ({ clinic_id: clinic.id, step_key: s.key, status: "pending" })),
  );

  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "clinic.create",
    clinicId: clinic.id,
    metadata: { name: f.name, clinic_type: f.clinic_type },
    ip: await clientIp(),
  });

  revalidatePath("/admin/self-hosted");
  redirect(`/admin/self-hosted/${clinic.id}`);
}

// ============ UPDATE INFRA / INFO (non-rahasia) ============
export async function updateSelfHostedInfra(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const me = await actor();
  const clinicId = String(formData.get("clinic_id") ?? "");
  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const f = readInfraFields(formData);
  if (f.name.length < 2) return { ok: false, error: "Nama klinik wajib diisi." };
  if (f.specializations.length === 0)
    return { ok: false, error: "Pilih minimal satu layanan klinik (Fisio / OT / TW)." };
  if (!["active", "suspended"].includes(f.license_status))
    return { ok: false, error: "Status lisensi tidak valid." };
  if (!PROV_STATUS.has(f.provisioning_status))
    return { ok: false, error: "Status provisioning tidak valid." };

  const db = createControlPlaneClient();
  const { error } = await db
    .from("selfhosted_clinics")
    .update({ ...f, updated_at: new Date().toISOString() })
    .eq("id", clinicId);
  if (error) return { ok: false, error: `Gagal menyimpan: ${error.message}` };

  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "clinic.update",
    clinicId,
    metadata: { provisioning_status: f.provisioning_status, license_status: f.license_status },
    ip: await clientIp(),
  });

  revalidatePath(`/admin/self-hosted/${clinicId}`);
  revalidatePath("/admin/self-hosted");
  return { ok: true };
}

// ============ SIMPAN SECRET (terenkripsi) ============
export async function saveSelfHostedSecret(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const me = await actor();
  const clinicId = String(formData.get("clinic_id") ?? "");
  const secretType = String(formData.get("secret_type") ?? "") as SecretType;
  const value = String(formData.get("value") ?? ""); // jangan trim — secret bisa punya spasi sah? aman: trim hanya newline

  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };
  if (!SECRET_TYPES.has(secretType)) return { ok: false, error: "Jenis secret tidak valid." };
  const clean = value.trim();
  if (clean.length < 8) return { ok: false, error: "Nilai secret terlalu pendek / kosong." };

  const db = createControlPlaneClient();
  // create vs update untuk label audit
  const { data: existing } = await db
    .from("selfhosted_secrets")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("secret_type", secretType)
    .maybeSingle();

  const sealed = await sealSecret(clean);
  const { error } = await db.from("selfhosted_secrets").upsert(
    {
      clinic_id: clinicId,
      secret_type: secretType,
      ciphertext: sealed.ciphertext,
      nonce: sealed.nonce,
      key_version: sealed.keyVersion,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_id,secret_type" },
  );
  if (error) return { ok: false, error: `Gagal menyimpan secret: ${error.message}` };

  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: existing ? "secret.update" : "secret.create",
    clinicId,
    secretType,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/self-hosted/${clinicId}`);
  return { ok: true };
}

// ============ REVEAL SECRET (dekripsi sekali — DICATAT) ============
export async function revealSelfHostedSecret(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const me = await actor();
  const clinicId = String(formData.get("clinic_id") ?? "");
  const secretType = String(formData.get("secret_type") ?? "") as SecretType;

  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };
  if (!SECRET_TYPES.has(secretType)) return { ok: false, error: "Jenis secret tidak valid." };

  const db = createControlPlaneClient();
  const { data: row, error } = await db
    .from("selfhosted_secrets")
    .select("ciphertext, nonce")
    .eq("clinic_id", clinicId)
    .eq("secret_type", secretType)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "Secret belum diatur." };

  let value: string;
  try {
    value = await openSecret({ ciphertext: row.ciphertext, nonce: row.nonce });
  } catch {
    return { ok: false, error: "Gagal mendekripsi (master key salah / berubah?)." };
  }

  // Audit WAJIB: setiap pembukaan secret tercatat.
  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "secret.reveal",
    clinicId,
    secretType,
    ip: await clientIp(),
  });

  return { ok: true, value };
}

// ============ UPDATE LANGKAH CHECKLIST ============
export async function updateProvisioningStep(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const me = await actor();
  const clinicId = String(formData.get("clinic_id") ?? "");
  const stepKey = String(formData.get("step_key") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };
  if (!PROVISIONING_STEPS.some((s) => s.key === stepKey))
    return { ok: false, error: "Langkah tidak valid." };
  if (!["pending", "done", "skipped", "failed"].includes(status))
    return { ok: false, error: "Status langkah tidak valid." };

  const db = createControlPlaneClient();
  const { error } = await db.from("selfhosted_provisioning_steps").upsert(
    {
      clinic_id: clinicId,
      step_key: stepKey,
      status,
      done_by: status === "done" ? me.id : null,
      done_at: status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_id,step_key" },
  );
  if (error) return { ok: false, error: error.message };

  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "step.update",
    clinicId,
    metadata: { step_key: stepKey, status },
    ip: await clientIp(),
  });

  revalidatePath(`/admin/self-hosted/${clinicId}`);
  return { ok: true };
}

// ============ BUAT PAKET DEPLOY (Fase 2A — semi-otomatis) ============
// Mendekripsi ketiga secret klinik & merakit paket deploy (config + wrangler +
// runbook) yang dijalankan operator di mesinnya. Karena MENGUNGKAP plaintext
// secret, aksi ini WAJIB ter-audit (sama seperti reveal).
export type DeployBundleResult = {
  ok: boolean;
  error?: string;
  missing?: string[];
  workerName?: string;
  configJson?: string;
  wranglerJson?: string;
  runbook?: string;
};

export async function generateDeployBundle(
  _prev: DeployBundleResult | null,
  formData: FormData,
): Promise<DeployBundleResult> {
  const me = await actor();
  const clinicId = String(formData.get("clinic_id") ?? "");
  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const assembled = await assembleBundleForClinic(clinicId);
  if (!assembled.ok) return { ok: false, error: assembled.error };
  const bundle = assembled.bundle;

  // Audit WAJIB: paket berisi plaintext secret.
  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "bundle.generate",
    clinicId,
    metadata: { worker_name: bundle.workerName, missing: bundle.missing },
    ip: await clientIp(),
  });

  return {
    ok: true,
    missing: bundle.missing,
    workerName: bundle.workerName,
    configJson: bundle.configJson,
    wranglerJson: bundle.wranglerJson,
    runbook: bundle.runbook,
  };
}

// ============ DEPLOY OTOMATIS (Fase 2B — picu CI: GitHub atau GitLab) ============
// Membuat token job sekali-pakai, lalu memicu pipeline CI yang jalan di runner kita.
// Provider: GitHub (repository_dispatch) bila GITHUB_REPO+GITHUB_TOKEN diset, jika
// tidak GitLab (pipeline trigger). Runner mengambil config & melaporkan langkah
// balik ke panel via token itu.
export type AutoDeployResult = {
  ok: boolean;
  error?: string;
  pipelineUrl?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  withCloudflare?: boolean;
};

function panelBaseUrl(): string {
  const BOM = String.fromCharCode(0xfeff);
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").split(BOM).join("").trim();
  return root ? `https://${root}` : "";
}

export async function triggerAutoDeploy(
  _prev: AutoDeployResult | null,
  formData: FormData,
): Promise<AutoDeployResult> {
  const me = await actor();
  const clinicId = String(formData.get("clinic_id") ?? "");
  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const panelUrl = panelBaseUrl();
  if (!panelUrl) return { ok: false, error: "NEXT_PUBLIC_ROOT_DOMAIN belum di-set." };

  // Pastikan klinik ada (di control-plane).
  const db = createControlPlaneClient();
  const { data: clinic } = await db
    .from("selfhosted_clinics")
    .select("id, name, owner_email")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) return { ok: false, error: "Klinik tidak ditemukan." };

  // Password awal akun owner: digenerate sekali di sini, disimpan di job (dipakai
  // runner saat seed) dan ditampilkan ke super admin satu kali.
  const seedPassword = generateSeedPassword();
  const withCloudflare = String(formData.get("deploy_cloudflare") ?? "") === "1";

  const job = await createDeployJob(clinicId, me.id, seedPassword);
  if ("error" in job) return { ok: false, error: `Gagal membuat job: ${job.error}` };

  const vars: Record<string, string> = {
    CLINIC_ID: clinicId,
    JOB_TOKEN: job.token,
    PANEL_URL: panelUrl,
  };
  if (withCloudflare) vars.DEPLOY_CLOUDFLARE = "1";
  const provider = isGitHubConfigured() ? "github" : "gitlab";
  const result = provider === "github" ? await triggerWorkflow(vars) : await triggerPipeline(vars);

  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "deploy.trigger",
    clinicId,
    metadata: {
      provider,
      with_cloudflare: withCloudflare,
      ok: result.ok,
      web_url: result.ok ? result.webUrl : null,
      error: result.ok ? null : result.error,
    },
    ip: await clientIp(),
  });

  if (!result.ok) return { ok: false, error: result.error };

  // Status provisioning → provisioning, supaya badge berubah.
  await db
    .from("selfhosted_clinics")
    .update({ provisioning_status: "provisioning", updated_at: new Date().toISOString() })
    .eq("id", clinicId);

  revalidatePath(`/admin/self-hosted/${clinicId}`);
  return {
    ok: true,
    pipelineUrl: result.webUrl ?? undefined,
    ownerEmail: (clinic.owner_email as string | null) ?? undefined,
    ownerPassword: seedPassword,
    withCloudflare,
  };
}

// ============ HAPUS KLINIK SELF-HOSTED (untuk test/salah input) ============
// Hanya menghapus baris registry + secret di control-plane kita. TIDAK menyentuh
// infrastruktur klinik (Supabase/Cloudflare mereka). Konfirmasi ketik nama.
export async function deleteSelfHostedClinic(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const me = await actor();
  const clinicId = String(formData.get("clinic_id") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!clinicId) return { ok: false, error: "Klinik tidak valid." };

  const db = createControlPlaneClient();
  const { data: clinic } = await db
    .from("selfhosted_clinics")
    .select("name")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) return { ok: false, error: "Klinik tidak ditemukan." };
  if (confirm !== clinic.name) {
    return { ok: false, error: `Konfirmasi tidak cocok. Ketik persis: ${clinic.name}` };
  }

  await logSelfHostedAudit({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "clinic.delete",
    clinicId,
    metadata: { name: clinic.name },
    ip: await clientIp(),
  });

  // secret & steps ikut terhapus via FK on delete cascade.
  const { error } = await db.from("selfhosted_clinics").delete().eq("id", clinicId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/self-hosted");
  redirect("/admin/self-hosted");
}
