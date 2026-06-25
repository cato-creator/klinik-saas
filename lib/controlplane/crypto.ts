// Enkripsi secret klinik self-hosted — AES-256-GCM via Web Crypto API.
// Web Crypto tersedia native di Cloudflare Workers & Node 20+ (tanpa library tambahan).
//
// Master key disimpan di env Worker (CONTROLPLANE_MASTER_KEY, base64 32 byte),
// TIDAK PERNAH di database. Kalau DB control-plane bocor, isinya cuma ciphertext.
//
// Generate master key sekali (lalu set sebagai secret Worker, server-only):
//   openssl rand -base64 32
//
// HANYA dipakai di server (Server Action / Route Handler). Plaintext secret
// tidak pernah dikirim ke client kecuali lewat aksi "reveal" yang ter-audit.

const KEY_VERSION = 1;
const BOM = String.fromCharCode(0xfeff);

function cleanEnv(value?: string): string {
  return (value ?? "").split(BOM).join("").trim();
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function getMasterKeyBytes(): Uint8Array {
  const raw = cleanEnv(process.env.CONTROLPLANE_MASTER_KEY);
  if (!raw) {
    throw new Error("CONTROLPLANE_MASTER_KEY belum di-set (server-only).");
  }
  const bytes = b64ToBytes(raw);
  if (bytes.length !== 32) {
    throw new Error("CONTROLPLANE_MASTER_KEY harus 32 byte (base64). Buat dengan: openssl rand -base64 32");
  }
  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", getMasterKeyBytes() as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export type Sealed = { ciphertext: string; nonce: string; keyVersion: number };

// Enkripsi plaintext → { ciphertext, nonce, keyVersion } siap disimpan ke DB.
export async function sealSecret(plaintext: string): Promise<Sealed> {
  const key = await importKey();
  const nonce = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce (standar GCM)
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, data as BufferSource);
  return {
    ciphertext: bytesToB64(new Uint8Array(ct)),
    nonce: bytesToB64(nonce),
    keyVersion: KEY_VERSION,
  };
}

// Dekripsi { ciphertext, nonce } → plaintext. HANYA panggil di server.
export async function openSecret(sealed: Pick<Sealed, "ciphertext" | "nonce">): Promise<string> {
  const key = await importKey();
  const ct = b64ToBytes(sealed.ciphertext);
  const nonce = b64ToBytes(sealed.nonce);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, ct as BufferSource);
  return new TextDecoder().decode(pt);
}
