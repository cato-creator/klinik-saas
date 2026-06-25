// Data layer klinik self-hosted (control-plane). Semua fungsi server-only.
import { createControlPlaneClient } from "./client";

export type SecretType = "supabase_service_role" | "supabase_db_password" | "cloudflare_token";

export const SECRET_LABELS: Record<SecretType, string> = {
  supabase_service_role: "Supabase service_role key",
  supabase_db_password: "Password database Supabase",
  cloudflare_token: "Cloudflare API token",
};

// Langkah provisioning (urutan ditampilkan di checklist).
export const PROVISIONING_STEPS: { key: string; label: string; hint: string }[] = [
  { key: "supabase_migrated", label: "Migrasi DB Supabase", hint: "Semua tabel/RLS/trigger sudah dibuat di Supabase klinik" },
  { key: "owner_seeded", label: "Akun owner dibuat", hint: "Akun login owner sudah di-seed di Supabase klinik" },
  { key: "pages_created", label: "Cloudflare di-deploy", hint: "App sudah ter-deploy ke akun Cloudflare klinik" },
  { key: "env_set", label: "Env/secret di-set", hint: "Supabase URL & key sudah dipasang di Worker klinik" },
  { key: "dns_ok", label: "Domain terhubung", hint: "Domain klinik sudah mengarah & aktif (SSL hijau)" },
  { key: "smoke_test", label: "Uji coba akhir", hint: "Buka web, login owner, coba booking — semua jalan" },
];

export type SelfHostedClinic = {
  id: string;
  name: string;
  clinic_type: string; // disiplin UTAMA (= specializations[0]); template default
  specializations: string[]; // semua disiplin yang dibuka klinik (≥1)
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  license_status: "active" | "suspended";
  license_paid_at: string | null;
  license_amount: number | null;
  maintenance_until: string | null;
  target_domain: string | null;
  supabase_url: string | null;
  supabase_project_ref: string | null;
  supabase_anon_key: string | null;
  supabase_pooler_url: string | null; // Session Pooler (IPv4) — utk migrasi DDL

  cloudflare_account_id: string | null;
  cloudflare_pages_project: string | null;
  provisioning_status: "draft" | "provisioning" | "live" | "suspended" | "failed";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProvisioningStep = {
  step_key: string;
  status: "pending" | "done" | "skipped" | "failed";
  notes: string | null;
  done_at: string | null;
};

export type AuditEntry = {
  id: number;
  actor_email: string | null;
  action: string;
  secret_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// Tulis baris audit. Best-effort: kegagalan audit tidak menggagalkan aksi utama,
// tapi dicatat ke console agar terlihat.
export async function logSelfHostedAudit(entry: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  clinicId?: string | null;
  secretType?: SecretType | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}): Promise<void> {
  try {
    const db = createControlPlaneClient();
    await db.from("selfhosted_audit_logs").insert({
      actor_user_id: entry.actorUserId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      clinic_id: entry.clinicId ?? null,
      secret_type: entry.secretType ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ip ?? null,
    });
  } catch (err) {
    console.error("[self-hosted audit] gagal tulis log:", err);
  }
}

// Status mana saja yang sudah punya secret (untuk badge "Tersimpan ✓" / "Belum diatur").
// Tidak mendekripsi apa pun — hanya mengecek keberadaan baris.
export async function getSecretPresence(clinicId: string): Promise<Record<SecretType, boolean>> {
  const db = createControlPlaneClient();
  const { data } = await db
    .from("selfhosted_secrets")
    .select("secret_type")
    .eq("clinic_id", clinicId);

  const present: Record<SecretType, boolean> = {
    supabase_service_role: false,
    supabase_db_password: false,
    cloudflare_token: false,
  };
  for (const row of data ?? []) present[row.secret_type as SecretType] = true;
  return present;
}
