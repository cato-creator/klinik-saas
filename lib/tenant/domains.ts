// Custom domain klinik (Stage 8). Dua fungsi inti:
//  1) resolveCustomDomainSubdomain(host) — dipakai MIDDLEWARE (edge) untuk
//     menerjemahkan host custom domain -> subdomain klinik, agar downstream
//     (landing page) bekerja seperti diakses lewat subdomain biasa.
//  2) verifyDomainDns(domain) — cek via DNS-over-HTTPS apakah domain sudah
//     diarahkan ke platform (CNAME/A cocok dgn ROOT_DOMAIN). Dipakai server action.
//
// Memakai @supabase/supabase-js (createAdminClient) yang berbasis fetch → aman
// di runtime edge/Workers. Tidak memakai next/headers (terlarang di middleware).
import { createAdminClient } from "@/lib/supabase/admin";
import { ROOT_DOMAIN } from "@/lib/tenant/host";

// Cache ringan per-isolate: host -> subdomain (atau null). Mengurangi query DB
// berulang untuk visitor custom domain dalam isolate yang sama. TTL pendek karena
// status verifikasi bisa berubah. Bukan pengganti cache edge — sekadar dedupe.
const TTL_MS = 60_000;
const cache = new Map<string, { sub: string | null; at: number }>();

/**
 * Terjemahkan host custom domain -> subdomain klinik. Hanya domain yang
 * `verified = true` & kliniknya aktif/expired (landing tetap publik) yang
 * di-resolve. Kembalikan null bila tidak cocok.
 */
export async function resolveCustomDomainSubdomain(
  host?: string | null,
): Promise<string | null> {
  if (!host) return null;
  const h = host.split(":")[0].toLowerCase().trim();
  if (!h) return null;

  const hit = cache.get(h);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.sub;

  let sub: string | null = null;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("domains")
      .select("verified, clinic:clinics!clinic_id(subdomain, status)")
      .eq("custom_domain", h)
      .eq("verified", true)
      .maybeSingle();

    const clinic = data?.clinic
      ? (Array.isArray(data.clinic) ? data.clinic[0] : data.clinic)
      : null;
    if (
      clinic?.subdomain &&
      !clinic.subdomain.startsWith("pending-") &&
      ["active", "expired"].includes(clinic.status as string)
    ) {
      sub = clinic.subdomain as string;
    }
  } catch {
    // Jika lookup gagal (DB sibuk), perlakukan sebagai tidak ketemu — jangan
    // menggagalkan middleware. Tidak di-cache agar dicoba lagi nanti.
    return null;
  }

  cache.set(h, { sub, at: Date.now() });
  return sub;
}

// Cache reverse: subdomain klinik -> custom domain terverifikasi (atau null).
// Dipakai middleware untuk redirect subdomain bawaan -> domain custom (canonical).
const revCache = new Map<string, { dom: string | null; at: number }>();

/**
 * Cari custom domain TERVERIFIKASI milik klinik dgn subdomain tertentu.
 * Kembalikan null bila klinik itu tidak punya custom domain aktif.
 */
export async function customDomainForSubdomain(
  subdomain?: string | null,
): Promise<string | null> {
  if (!subdomain) return null;
  const sub = subdomain.toLowerCase().trim();
  if (!sub) return null;

  const hit = revCache.get(sub);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.dom;

  let dom: string | null = null;
  try {
    const db = createAdminClient();
    // Cari klinik dgn subdomain ini, lalu domain verified-nya (jika ada).
    const { data: clinic } = await db
      .from("clinics")
      .select("id, status")
      .eq("subdomain", sub)
      .maybeSingle();
    if (clinic?.id && ["active", "expired"].includes(clinic.status as string)) {
      const { data } = await db
        .from("domains")
        .select("custom_domain")
        .eq("clinic_id", clinic.id)
        .eq("verified", true)
        .maybeSingle();
      if (data?.custom_domain) dom = data.custom_domain as string;
    }
  } catch {
    return null; // jangan ganggu middleware bila lookup gagal; tidak di-cache.
  }

  revCache.set(sub, { dom, at: Date.now() });
  return dom;
}

// ---------------------------------------------------------------------------
// Verifikasi DNS via DNS-over-HTTPS (Cloudflare 1.1.1.1, format JSON).
// ---------------------------------------------------------------------------

type DohAnswer = { name: string; type: number; data: string };

async function dohQuery(name: string, type: "A" | "CNAME"): Promise<DohAnswer[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) return [];
  const json = (await res.json()) as { Answer?: DohAnswer[] };
  return json.Answer ?? [];
}

function normalizeHost(s: string): string {
  return s.replace(/\.$/, "").toLowerCase().trim();
}

export type DnsVerifyResult = { ok: boolean; detail: string };

/**
 * Cek apakah `domain` sudah diarahkan ke platform:
 *  - CNAME domain menunjuk ke ROOT_DOMAIN (atau subdomain di bawahnya), ATAU
 *  - A record domain beririsan dengan A record ROOT_DOMAIN (kasus CNAME
 *    flattening / proxied Cloudflare di apex).
 * Mengembalikan ok=true bila salah satu terpenuhi.
 */
export async function verifyDomainDns(domain: string): Promise<DnsVerifyResult> {
  const d = normalizeHost(domain);
  const root = normalizeHost(ROOT_DOMAIN);
  if (!root) return { ok: false, detail: "ROOT_DOMAIN platform belum di-set." };

  try {
    // 1) Cek CNAME → ROOT_DOMAIN
    const cnames = await dohQuery(d, "CNAME");
    for (const a of cnames) {
      const target = normalizeHost(a.data);
      if (target === root || target.endsWith("." + root)) {
        return { ok: true, detail: `CNAME mengarah ke ${target}` };
      }
    }

    // 2) Fallback: bandingkan A record domain dgn A record ROOT_DOMAIN.
    const [domainA, rootA] = await Promise.all([
      dohQuery(d, "A"),
      dohQuery(root, "A"),
    ]);
    const rootIps = new Set(rootA.filter((a) => a.type === 1).map((a) => a.data));
    const shared = domainA.filter((a) => a.type === 1 && rootIps.has(a.data));
    if (shared.length > 0) {
      return { ok: true, detail: `IP cocok dengan platform (${shared[0].data})` };
    }

    return {
      ok: false,
      detail:
        "Belum terdeteksi. Pastikan record CNAME sudah dibuat & tunggu propagasi DNS (bisa sampai beberapa menit).",
    };
  } catch {
    return { ok: false, detail: "Gagal mengecek DNS. Coba lagi sebentar." };
  }
}
