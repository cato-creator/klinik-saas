// Konstanta & util terkait situs / WhatsApp.

// Nomor WhatsApp platform (fallback). Nomor per-klinik sebaiknya dioper via prop
// dari record clinics / landing_page_content.
export const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? '6281234567890'

export function waLink(text = 'Halo, saya ingin bertanya tentang layanan terapi.', number: string = WA_NUMBER) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

// Normalisasi nomor HP Indonesia ke format wa.me ("62…", tanpa + / spasi).
// "0812…" → "62812…", "+62812…"/"62812…" → "62812…". Kosong bila tak valid.
export function toWaNumber(phone?: string | null): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('8')) return '62' + digits
  return digits
}
