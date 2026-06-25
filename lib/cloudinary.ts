// Upload gambar ke Cloudinary (pengganti Supabase Storage) supaya Storage
// Supabase tetap di kuota free plan. Semua file/foto publik (logo, foto galeri,
// foto & tanda tangan terapis, bukti bayar) di-upload ke sini.
//
// Implementasi memakai REST API Cloudinary + Web Crypto (SHA-1) lewat `fetch`,
// BUKAN SDK `cloudinary` (yang Node-only dan berat) → aman di Cloudflare Workers.
//
// Env yang dibutuhkan (server-only, set via `wrangler secret put ...`):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

// Bersihkan BOM (U+FEFF) & whitespace yang kadang menempel saat env di-set di
// dashboard host (konsisten dgn lib/supabase/server.ts).
const BOM = String.fromCharCode(0xfeff)
function cleanEnv(value?: string): string {
  return (value ?? '').split(BOM).join('').trim()
}

const CLOUD_NAME = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME)
const API_KEY = cleanEnv(process.env.CLOUDINARY_API_KEY)
const API_SECRET = cleanEnv(process.env.CLOUDINARY_API_SECRET)

// Folder root di akun Cloudinary supaya semua aset platform terkelompok rapi.
const ROOT_FOLDER = 'klinik'

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export type CloudinaryUploadOptions = {
  // Sub-folder logis di bawah ROOT_FOLDER, mis. `${clinicId}/therapists`.
  // Path selalu diawali clinic_id utk isolasi antar klinik (CLAUDE.md §8).
  folder: string
  // public_id deterministik (tanpa ekstensi) bila ingin menimpa file lama,
  // mis. bukti bayar di-key pakai booking_id. Kosongkan utk nama acak.
  publicId?: string
}

/**
 * Upload satu gambar ke Cloudinary (signed upload). Mengembalikan `secure_url`.
 * Lempar Error dgn pesan jelas bila env belum di-set atau upload gagal.
 */
export async function uploadImageToCloudinary(
  file: File | Blob,
  { folder, publicId }: CloudinaryUploadOptions,
): Promise<string> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error(
      'Cloudinary belum dikonfigurasi (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).',
    )
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const fullFolder = `${ROOT_FOLDER}/${folder}`

  // Parameter yang ikut ditandatangani (semua kecuali file, api_key, cloud_name).
  const signed: Record<string, string> = {
    folder: fullFolder,
    timestamp: String(timestamp),
  }
  if (publicId) {
    signed.public_id = publicId
    signed.overwrite = 'true'
    signed.invalidate = 'true'
  }

  // Signature = SHA1( "k1=v1&k2=v2..." (urut alfabet) + API_SECRET ).
  const toSign = Object.keys(signed)
    .sort()
    .map((k) => `${k}=${signed[k]}`)
    .join('&')
  const signature = await sha1Hex(toSign + API_SECRET)

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', API_KEY)
  form.append('signature', signature)
  for (const [k, v] of Object.entries(signed)) form.append(k, v)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  )
  const json = (await res.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null

  if (!res.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || 'Gagal upload ke Cloudinary')
  }
  return json.secure_url
}
