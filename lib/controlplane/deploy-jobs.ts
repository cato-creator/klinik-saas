// Token job deploy otomatis (Fase 2B). Server-only.
//
// Alur: panel membuat token acak → kirim ke pipeline GitLab sebagai CI variable →
// runner memakainya untuk mengambil config & melaporkan langkah ke panel. Yang
// disimpan di DB hanya HASH-nya; token plaintext hanya ada di memori panel (saat
// trigger) dan di environment job runner (PC kita sendiri).
import { createControlPlaneClient } from "./client";

const TOKEN_TTL_MIN = 60; // token berlaku 60 menit (cukup untuk satu deploy)

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

// SHA-256 hex — Web Crypto (tersedia di Worker & Node 20+).
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

// Buat job + token. Mengembalikan token PLAINTEXT (hanya saat ini) untuk dikirim
// ke CI. DB hanya menyimpan hash token. seedPassword disimpan agar runner & super
// admin memakai password awal yang sama.
export async function createDeployJob(
  clinicId: string,
  createdBy?: string | null,
  seedPassword?: string | null,
): Promise<{ token: string; jobId: string } | { error: string }> {
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString();

  const db = createControlPlaneClient();
  const { data, error } = await db
    .from("selfhosted_deploy_jobs")
    .insert({
      clinic_id: clinicId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: createdBy ?? null,
      seed_password: seedPassword ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "gagal membuat job" };
  return { token, jobId: data.id };
}

// Verifikasi token untuk sebuah klinik. Valid bila: hash cocok, clinic_id cocok,
// belum kedaluwarsa. Mengembalikan jobId + seedPassword bila valid.
export async function verifyDeployJob(
  clinicId: string,
  token: string,
): Promise<{ ok: true; jobId: string; seedPassword: string | null } | { ok: false }> {
  if (!token) return { ok: false };
  const tokenHash = await hashToken(token);

  const db = createControlPlaneClient();
  const { data } = await db
    .from("selfhosted_deploy_jobs")
    .select("id, expires_at, seed_password")
    .eq("clinic_id", clinicId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!data) return { ok: false };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false };
  return { ok: true, jobId: data.id, seedPassword: data.seed_password ?? null };
}

// Tandai hasil akhir job (dipanggil runner saat selesai/gagal).
export async function setDeployJobStatus(
  jobId: string,
  status: "succeeded" | "failed",
): Promise<void> {
  const db = createControlPlaneClient();
  await db.from("selfhosted_deploy_jobs").update({ status }).eq("id", jobId);
}
