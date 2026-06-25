// Konstanta umum lintas-klinik. Nilai spesifik per klinik (nama, telp, alamat,
// rekening) sebaiknya diambil dari record `clinics` / `landing_page_content`,
// bukan dari sini — konstanta di bawah hanya fallback/format default.

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// Fallback generik tingkat platform. Data per-klinik sebaiknya dari record
// `clinics`/`landing_page_content` dan dioper via props (mis. invoice).
export const CLINIC_NAME = process.env.NEXT_PUBLIC_CLINIC_NAME ?? 'Klinik Terapi'
export const CLINIC_PHONE = process.env.NEXT_PUBLIC_CLINIC_PHONE ?? '-'
export const CLINIC_ADDRESS = process.env.NEXT_PUBLIC_CLINIC_ADDRESS ?? '-'

export const BANK_ACCOUNT = {
  bank: 'BCA',
  number: '-',
  name: CLINIC_NAME,
}

export const BOOKING_ADVANCE_DAYS = 30

export const PAYMENT_METHODS = [
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash', label: 'Tunai' },
  { value: 'bpjs', label: 'BPJS' },
] as const

export const GENDERS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
] as const

export const BOOKING_STATUSES = [
  { value: 'pending', label: 'Menunggu Verifikasi', color: 'yellow' },
  { value: 'confirmed', label: 'Dikonfirmasi', color: 'blue' },
  { value: 'completed', label: 'Selesai', color: 'green' },
  { value: 'cancelled', label: 'Dibatalkan', color: 'red' },
] as const

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf']
