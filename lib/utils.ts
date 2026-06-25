import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInYears, parseISO, intervalToDuration } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { id } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

// Format angka jadi string berpemisah ribuan gaya Indonesia (titik tiap ribuan):
//   150000 / "150000" -> "150.000". Non-digit diabaikan. Cocok utk input harga.
export function formatThousands(value: string | number): string {
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Kebalikan formatThousands: ambil angka murni dari string ("150.000" -> 150000).
export function parseThousands(value: string): number {
  const digits = String(value).replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

export function formatDate(date: string | Date, fmt = 'd MMMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: id })
}

export function formatTime(time: string): string {
  // "09:00:00" → "09.00"
  return time.slice(0, 5).replace(':', '.')
}

// Tanggal "hari ini" menurut WIB (Asia/Jakarta) → "yyyy-MM-dd".
// Penting: server berjalan di UTC, jadi new Date() bisa meleset tanggalnya.
export function todayJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

// Tanggal & waktu sekarang dalam WIB sebagai objek Date (untuk diformat).
export function nowJakarta(): Date {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date())
  // s: "06/16/2026, 09:30:00"
  const [d, t] = s.split(', ')
  const [mm, dd, yyyy] = d.split('/')
  return new Date(`${yyyy}-${mm}-${dd}T${t}`)
}

// "00:00" dipakai sebagai penanda jam belum dijadwalkan (diatur admin kemudian).
export function isUnscheduledTime(time?: string | null): boolean {
  return !time || time.slice(0, 5) === '00:00'
}

// ============================================
// SLOT JAM BOOKING (semua dalam WIB / wall-clock)
// ============================================

// Index getUTCDay (0=Minggu) → key hari di operating_hours.
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

// Hari (mon/tue/...) untuk sebuah tanggal "yyyy-MM-dd". Dihitung di UTC agar
// hasilnya tidak bergeser oleh timezone server (hari kalender bersifat absolut).
export function dayKeyOf(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`)
  return DAY_KEYS[d.getUTCDay()]
}

// "08:00-17:00" → [480, 1020] (menit sejak 00:00), atau null bila kosong/tak valid.
export function parseHoursRange(range?: string | null): [number, number] | null {
  const m = String(range ?? '').match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/)
  if (!m) return null
  const start = +m[1] * 60 + +m[2]
  const end = +m[3] * 60 + +m[4]
  if (end <= start) return null
  return [start, end]
}

const minToHHMM = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// Slot per jam dari sebuah range "08:00-17:00" → ["08:00","09:00",...,"16:00"].
// stepMin = panjang slot (default 60 menit). Slot terakhir harus selesai <= jam tutup.
export function hourlySlots(range?: string | null, stepMin = 60): string[] {
  const parsed = parseHoursRange(range)
  if (!parsed) return []
  const [start, end] = parsed
  const out: string[] = []
  for (let t = start; t + stepMin <= end; t += stepMin) out.push(minToHHMM(t))
  return out
}

// Waktu sekarang dalam menit sejak 00:00 menurut WIB (untuk menonaktifkan slot lewat).
export function nowMinutesJakarta(): number {
  const n = nowJakarta()
  return n.getHours() * 60 + n.getMinutes()
}

// Format timestamp (instan UTC dari DB) ke wall-clock WIB. WAJIB pakai timezone
// eksplisit: server (Cloudflare Workers) berjalan di UTC, jadi format() biasa akan
// menampilkan jam UTC (meleset 7 jam) walau diberi label "WIB".
export function formatDatetime(date: string): string {
  return formatInTimeZone(parseISO(date), 'Asia/Jakarta', "d MMM yyyy, HH.mm 'WIB'", { locale: id })
}

// "2026-06-12" → "12 Jun 2026". Aman utk tanggal kosong/parsial.
export function formatTanggalPendek(date: string): string {
  const s = String(date ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '-'
  return format(parseISO(s), 'd MMM yyyy', { locale: id })
}

export function calculateAge(birthDate: string): number {
  return differenceInYears(new Date(), parseISO(birthDate))
}

// "72 Tahun 8 Bulan 15 Hari"
export function formatAgeDetailed(birthDate: string): string {
  const d = intervalToDuration({ start: parseISO(birthDate), end: new Date() })
  const parts: string[] = []
  if (d.years) parts.push(`${d.years} Tahun`)
  if (d.months) parts.push(`${d.months} Bulan`)
  if (d.days) parts.push(`${d.days} Hari`)
  return parts.join(' ') || '0 Hari'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function validatePhone(phone: string): boolean {
  return /^(\+62|62|08)\d{8,13}$/.test(phone.replace(/\s|-/g, ''))
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s|-/g, '')
  if (cleaned.startsWith('+62')) return cleaned
  if (cleaned.startsWith('62')) return '+' + cleaned
  if (cleaned.startsWith('08')) return '+62' + cleaned.slice(1)
  return cleaned
}

// Semua kemungkinan format penyimpanan sebuah nomor HP Indonesia, untuk
// pencocokan/dedup pasien. Dipakai agar orang yang SAMA—yang nomornya tersimpan
// dalam format berbeda (mis. lama "0812..." vs baru kanonik "+62812...", atau
// admin mengetik "62812...")—tetap dikenali satu pasien (No. RM tidak berganda).
//   "0812-3456" -> ["0812-3456" dibersihkan, "+62812...", "62812...", "0812...", "812..."]
export function phoneVariants(phone: string): string[] {
  const cleaned = phone.replace(/\s|-/g, '')
  let core = cleaned
  if (core.startsWith('+62')) core = core.slice(3)
  else if (core.startsWith('62')) core = core.slice(2)
  else if (core.startsWith('0')) core = core.slice(1)
  const set = new Set<string>([cleaned, '+62' + core, '62' + core, '0' + core, core])
  return [...set].filter((s) => s.length > 0)
}

// Normalisasi nama untuk pencocokan pasien (dedup): rapikan spasi & samakan
// huruf besar/kecil. "  Budi  Santoso " -> "budi santoso". Dipakai bersama
// phoneVariants agar (HP sama + nama sama) = satu pasien, tapi (HP sama + nama
// beda) = pasien berbeda (mis. keluarga berbagi 1 nomor).
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Normalisasi input No. RM agar fleksibel untuk pasien lama: terima "1", "RM1",
// "rm-1", "RM-000001" → semua jadi "RM-000001" (format kanonik di DB).
// Bila bukan pola RM/angka, kembalikan apa adanya (uppercase) → lookup gagal wajar.
export function normalizeRM(input: string): string {
  const s = input.trim().toUpperCase().replace(/\s/g, '')
  const digits = s.replace(/^RM-?/, '')
  if (/^\d+$/.test(digits)) return 'RM-' + digits.padStart(6, '0')
  return s
}

// Cocokkan No. RM untuk PENCARIAN (mis. di dashboard terapis). Bila pengguna
// mengetik ANGKA (mis. "1", "01", "RM-1"), cocokkan by NILAI angkanya — abaikan
// prefix "RM-" & nol depan: "1" → RM-000001 saja (bukan RM-000010/000011 dst).
// Bila query bukan angka, fallback ke pencocokan teks (substring).
export function matchRM(rm: string | null | undefined, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const target = (rm ?? '').toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  if (qDigits) {
    const tDigits = target.replace(/\D/g, '')
    return tDigits !== '' && parseInt(tDigits, 10) === parseInt(qDigits, 10)
  }
  return target.includes(q)
}

// Tampilan No. RM sebagai ANGKA berpadding nol (tanpa prefix "RM-"), mis.
// "RM-000001" → "000001". Penyimpanan & pencocokan tetap pakai bentuk kanonik
// (normalizeRM/matchRM yang menerima angka apa adanya), ini HANYA untuk tampil.
export function formatRM(rm: string | null | undefined): string {
  if (rm == null || rm === '') return '—'
  const digits = String(rm).replace(/\D/g, '')
  if (!digits) return String(rm)
  return digits.padStart(6, '0')
}

export function generateBookingCode(date: Date = new Date()): string {
  const dateStr = format(date, 'yyyyMMdd')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `KLN-${dateStr}-${rand}`
}

export function generateInvoiceNumber(date: Date = new Date()): string {
  const year = format(date, 'yyyy')
  const month = format(date, 'MM')
  const rand = Math.random().toString().slice(2, 6)
  return `INV/${year}/${month}/${rand}`
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[dayOfWeek]
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Menunggu Verifikasi',
    confirmed: 'Dikonfirmasi',
    in_progress: 'Dikonfirmasi', // status lama (legacy) — diperlakukan seperti dikonfirmasi
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  }
  return map[status] ?? status
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    in_progress: 'blue',
    completed: 'green',
    cancelled: 'red',
  }
  return map[status] ?? 'gray'
}

// Status booking yang DITAMPILKAN — berbasis pembayaran. Sebuah booking baru
// dianggap "Dikonfirmasi" setelah admin/owner mengonfirmasi pembayaran
// (payment_status = 'paid'). Sebelum itu — termasuk booking manual yang otomatis
// status='confirmed' tapi belum dibayar — tampil "Perlu Konfirmasi".
export function getBookingStatusLabel(status: string, paymentStatus?: string | null): string {
  if (status === 'cancelled') return 'Dibatalkan'
  if (status === 'completed') return 'Selesai'
  if (paymentStatus === 'paid') return 'Dikonfirmasi'
  return 'Perlu Konfirmasi'
}

export function getBookingStatusColor(status: string, paymentStatus?: string | null): string {
  if (status === 'cancelled') return 'red'
  if (status === 'completed') return 'green'
  if (paymentStatus === 'paid') return 'blue'
  return 'yellow'
}

// true bila booking sudah DITERIMA klinik (dikonfirmasi admin/owner) — terapis boleh
// mengisi catatan. Pembayaran TIDAK menjadi syarat: pasien manual/jadwalkan ulang
// sering dijadwalkan (status='confirmed') sebelum membayar, dan terapis tetap harus
// bisa mengisi catatan saat sesi. Yang dikunci hanya booking web yang masih
// 'pending' (belum diterima admin) atau 'cancelled'.
export function isBookingConfirmed(status: string, paymentStatus?: string | null): boolean {
  if (status === 'cancelled') return false
  return (
    status === 'confirmed' ||
    status === 'in_progress' ||
    status === 'completed' ||
    paymentStatus === 'paid'
  )
}

export function getPaymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    unpaid: 'Belum Bayar',
    paid: 'Lunas',
    refunded: 'Dikembalikan',
  }
  return map[status] ?? status
}

export function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    qris: 'QRIS',
    transfer: 'Transfer Bank',
    cash: 'Tunai',
    bpjs: 'BPJS',
  }
  return map[method] ?? method
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}
