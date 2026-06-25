// Validasi & daftar reserved subdomain (CLAUDE.md §9.3).

export const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "admin", "api", "mail", "smtp", "imap", "pop", "ftp",
  "static", "assets", "cdn", "img", "images", "media", "files", "docs",
  "blog", "help", "support", "status", "dashboard", "auth", "login",
  "platformlo", "platform", "billing", "pay", "payment", "checkout",
  "ns1", "ns2", "dns", "vpn", "test", "staging", "dev", "demo",
]);

// Format: lowercase [a-z0-9-], 3-63 char, tidak diawali/diakhiri '-'.
const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export function validateSubdomain(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = (raw ?? "").trim().toLowerCase();

  if (value.length < 3 || value.length > 63) {
    return { ok: false, error: "Subdomain harus 3–63 karakter." };
  }
  if (!SUBDOMAIN_RE.test(value)) {
    return { ok: false, error: "Hanya huruf kecil, angka, dan '-'. Tidak boleh diawali/diakhiri '-'." };
  }
  if (value.includes("--")) {
    return { ok: false, error: "Tidak boleh ada '--' berurutan." };
  }
  if (RESERVED_SUBDOMAINS.has(value)) {
    return { ok: false, error: `Subdomain '${value}' dicadangkan, pilih yang lain.` };
  }
  return { ok: true, value };
}
