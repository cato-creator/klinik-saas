// Perakit bundle deploy dari clinicId (server-only). Dipakai oleh aksi panel
// (generateDeployBundle) DAN API runner (/api/self-hosted/ci/config) supaya
// logika ambil-klinik + dekripsi-secret + rakit-bundle tidak terduplikasi.
import { createControlPlaneClient } from "./client";
import { openSecret } from "./crypto";
import {
  buildDeployBundle,
  generateSeedPassword,
  type DeployBundle,
  type DeploySecrets,
} from "./deploy-bundle";
import type { SecretType, SelfHostedClinic } from "./self-hosted";

export async function assembleBundleForClinic(
  clinicId: string,
): Promise<{ ok: true; bundle: DeployBundle } | { ok: false; error: string }> {
  const db = createControlPlaneClient();

  const { data: clinic, error: clinicErr } = await db
    .from("selfhosted_clinics")
    .select("*")
    .eq("id", clinicId)
    .maybeSingle();
  if (clinicErr) return { ok: false, error: clinicErr.message };
  if (!clinic) return { ok: false, error: "Klinik tidak ditemukan." };

  const { data: rows, error: secErr } = await db
    .from("selfhosted_secrets")
    .select("secret_type, ciphertext, nonce")
    .eq("clinic_id", clinicId);
  if (secErr) return { ok: false, error: secErr.message };

  const secrets: DeploySecrets = {
    supabase_service_role: "",
    supabase_db_password: "",
    cloudflare_token: "",
  };
  try {
    for (const row of rows ?? []) {
      const t = row.secret_type as SecretType;
      if (t in secrets) {
        secrets[t as keyof DeploySecrets] = await openSecret({
          ciphertext: row.ciphertext,
          nonce: row.nonce,
        });
      }
    }
  } catch {
    return { ok: false, error: "Gagal mendekripsi secret (master key salah / berubah?)." };
  }

  const bundle = buildDeployBundle({
    clinic: clinic as SelfHostedClinic,
    secrets,
    seedPassword: generateSeedPassword(),
  });
  return { ok: true, bundle };
}
