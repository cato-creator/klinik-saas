// Integrasi Cloudflare for SaaS — Custom Hostnames API.
// Dipakai SERVER-ONLY (server actions) untuk mendaftarkan/cek/hapus domain
// pelanggan secara otomatis, sehinggga super admin tidak perlu menambah hostname
// manual di dashboard. Lihat alur di app/owner/domain/actions.ts.
//
// ENV (server-only, JANGAN prefix NEXT_PUBLIC_):
//   CLOUDFLARE_API_TOKEN  — token dgn izin Zone > SSL and Certificates > Edit
//   CLOUDFLARE_ZONE_ID    — zone id apkfun.eu.org

const BOM = String.fromCharCode(0xfeff);
function cleanEnv(value?: string): string {
  return (value ?? "").split(BOM).join("").trim();
}

const API_BASE = "https://api.cloudflare.com/client/v4";

function config() {
  const token = cleanEnv(process.env.CLOUDFLARE_API_TOKEN);
  const zoneId = cleanEnv(process.env.CLOUDFLARE_ZONE_ID);
  return { token, zoneId, ok: Boolean(token && zoneId) };
}

// Apakah integrasi API aktif (env terisi). Bila false, fitur jatuh ke mode manual
// (domain tetap tersimpan, owner/super admin daftar hostname manual di dashboard).
export function cloudflareSaasEnabled(): boolean {
  return config().ok;
}

type CfCustomHostname = {
  id: string;
  hostname: string;
  status?: string; // pending | active | ...
  ssl?: { status?: string };
};

type CfResponse<T> = {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: T;
};

async function cfFetch<T>(
  path: string,
  init: RequestInit,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const { token } = config();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const json = (await res.json()) as CfResponse<T>;
    if (!json.success) {
      const msg = json.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, result: json.result as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

// Ringkas status hostname Cloudflare → label sederhana untuk owner.
function summarizeStatus(h: CfCustomHostname): string {
  const ssl = h.ssl?.status ?? "";
  if (h.status === "active" && ssl === "active") return "active";
  if (h.status === "active") return "pending_validation"; // hostname ok, SSL blm
  return h.status || "pending";
}

export type CfHostnameResult = {
  id: string;
  status: string; // ringkas: active | pending_validation | pending | ...
};

/**
 * Daftarkan domain pelanggan sebagai Custom Hostname (DV cert, validasi HTTP).
 * Idempoten secukupnya: bila sudah terdaftar, Cloudflare mengembalikan error —
 * pemanggil sebaiknya simpan id saat sukses & pakai getCustomHostname utk cek ulang.
 */
export async function createCustomHostname(
  hostname: string,
): Promise<{ ok: true; data: CfHostnameResult } | { ok: false; error: string }> {
  const { zoneId } = config();
  const r = await cfFetch<CfCustomHostname>(`/zones/${zoneId}/custom_hostnames`, {
    method: "POST",
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http", // validasi otomatis lewat CNAME yg sudah proxied
        type: "dv",
        settings: { min_tls_version: "1.2" },
      },
    }),
  });
  if (!r.ok) return r;
  return { ok: true, data: { id: r.result.id, status: summarizeStatus(r.result) } };
}

/** Cek status hostname (untuk tahu apakah SSL sudah active). */
export async function getCustomHostname(
  id: string,
): Promise<{ ok: true; data: CfHostnameResult } | { ok: false; error: string }> {
  const { zoneId } = config();
  const r = await cfFetch<CfCustomHostname>(`/zones/${zoneId}/custom_hostnames/${id}`, {
    method: "GET",
  });
  if (!r.ok) return r;
  return { ok: true, data: { id: r.result.id, status: summarizeStatus(r.result) } };
}

/** Cari hostname berdasarkan nama (fallback bila id belum tersimpan). */
export async function findCustomHostname(
  hostname: string,
): Promise<{ ok: true; data: CfHostnameResult | null } | { ok: false; error: string }> {
  const { zoneId } = config();
  const r = await cfFetch<CfCustomHostname[]>(
    `/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
    { method: "GET" },
  );
  if (!r.ok) return r;
  const found = (r.result ?? [])[0];
  return { ok: true, data: found ? { id: found.id, status: summarizeStatus(found) } : null };
}

/** Hapus hostname dari Cloudflare (saat owner menghapus/ganti domain). */
export async function deleteCustomHostname(id: string): Promise<{ ok: boolean; error?: string }> {
  const { zoneId } = config();
  const r = await cfFetch<{ id: string }>(`/zones/${zoneId}/custom_hostnames/${id}`, {
    method: "DELETE",
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
