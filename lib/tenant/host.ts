// Helper resolusi subdomain tenant dari host header. Murni (tanpa next/headers)
// agar bisa dipakai di middleware (edge) maupun server components.

export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").trim().toLowerCase();

// Label yang dianggap "platform", bukan klinik.
const PLATFORM_LABELS = new Set(["www", "app", "admin", "api", "platform", "platformlo"]);

/**
 * Ambil label subdomain klinik dari host. Mengembalikan null bila host adalah
 * domain utama / platform / tidak relevan.
 *   kliniku.apkfun.eu.org      -> "kliniku"
 *   apkfun.eu.org / www.*      -> null (platform)
 *   kliniku.localhost:3000     -> "kliniku" (dev)
 *   klinik-saas.workers.dev    -> null (platform fallback)
 */
export function subdomainFromHost(host?: string | null): string | null {
  if (!host) return null;
  const h = host.split(":")[0].toLowerCase().trim(); // buang port

  // Dev: {sub}.localhost
  if (h === "localhost" || h.endsWith(".localhost")) {
    if (h === "localhost") return null;
    const label = h.slice(0, -".localhost".length);
    return label && !PLATFORM_LABELS.has(label) ? label : null;
  }

  if (!ROOT_DOMAIN) return null;
  if (h === ROOT_DOMAIN) return null;

  if (h.endsWith("." + ROOT_DOMAIN)) {
    const label = h.slice(0, h.length - ROOT_DOMAIN.length - 1);
    // Hanya 1 level (tanpa titik lagi) & bukan label platform.
    if (!label || label.includes(".") || PLATFORM_LABELS.has(label)) return null;
    return label;
  }

  // Host lain (workers.dev, dll) → platform.
  return null;
}

// Public suffix multi-label yang umum (untuk memisahkan label "host" dari domain
// terdaftar saat menampilkan instruksi DNS). Bukan PSL lengkap, tapi mencakup
// kasus umum Indonesia & internasional. TLD 1-label (.com/.id/.org) tak perlu
// didaftar (default registrable = 2 label).
const MULTI_LABEL_SUFFIXES = [
  "eu.org",
  "co.id", "or.id", "web.id", "my.id", "biz.id", "ac.id", "sch.id", "go.id", "desa.id", "ponpes.id",
  "co.uk", "org.uk", "me.uk",
  "com.au", "net.au", "org.au",
  "co.jp", "com.sg", "com.my", "co.nz",
];

/**
 * Ambil label "Name / Host" yang harus diisi user di pengelola DNS-nya — yaitu
 * bagian domain SEBELUM domain terdaftarnya, bukan FQDN penuh. Banyak penyedia
 * DNS hanya mau label (mis. `www`); kalau user menempel FQDN penuh malah jadi
 * record ganda (`www.domain.com.domain.com`) → error.
 *   www.realmadridwallpp.eu.org -> "www"
 *   klinik.domain.com           -> "klinik"
 *   domain.com (apex)           -> "@"
 */
export function dnsHostLabel(domain: string): string {
  const d = domain.split(":")[0].replace(/\.$/, "").toLowerCase().trim();
  if (!d || !d.includes(".")) return "@";
  const labels = d.split(".");
  const suffix = MULTI_LABEL_SUFFIXES.find((s) => d === s || d.endsWith("." + s));
  const registrableLen = suffix ? suffix.split(".").length + 1 : 2;
  const hostLabels = labels.slice(0, Math.max(0, labels.length - registrableLen));
  return hostLabels.length ? hostLabels.join(".") : "@";
}

/**
 * Ambil domain apex (registrable) dari sebuah hostname — kebalikan dari
 * dnsHostLabel: bagian domain terdaftarnya saja, tanpa label di depan.
 *   www.domainanda.com         -> "domainanda.com"
 *   klinik.domainanda.com      -> "domainanda.com"
 *   klinik.domainanda.co.id    -> "domainanda.co.id"
 *   domainanda.com (apex)      -> "domainanda.com"
 */
export function apexDomain(domain: string): string {
  const d = domain.split(":")[0].replace(/\.$/, "").toLowerCase().trim();
  if (!d || !d.includes(".")) return d;
  const labels = d.split(".");
  const suffix = MULTI_LABEL_SUFFIXES.find((s) => d === s || d.endsWith("." + s));
  const registrableLen = suffix ? suffix.split(".").length + 1 : 2;
  return labels.slice(Math.max(0, labels.length - registrableLen)).join(".");
}

/**
 * Apakah host ini KANDIDAT custom domain klinik — yaitu bukan domain utama
 * platform, bukan subdomain platform, bukan localhost, bukan *.workers.dev.
 * Dipakai middleware: hanya host kandidat yang perlu di-resolve ke tabel
 * `domains` (hindari query DB utk traffic domain utama/subdomain).
 *   kliniksaya.com         -> true
 *   www.kliniksaya.com     -> true
 *   apkfun.eu.org          -> false (platform)
 *   kliniku.apkfun.eu.org  -> false (subdomain platform)
 *   localhost / *.localhost-> false
 *   klinik-saas.workers.dev-> false
 */
export function isCustomDomainCandidate(host?: string | null): boolean {
  if (!host) return false;
  const h = host.split(":")[0].toLowerCase().trim();
  if (!h || !h.includes(".")) return false;
  if (h === "localhost" || h.endsWith(".localhost")) return false;
  if (h.endsWith(".workers.dev")) return false;
  if (ROOT_DOMAIN && (h === ROOT_DOMAIN || h.endsWith("." + ROOT_DOMAIN))) return false;
  return true;
}
