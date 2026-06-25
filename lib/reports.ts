import { format, subMonths, startOfMonth } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PaymentRow {
  amount: number
  method: string
  confirmedAt: string
  therapistName: string
  patientName: string
  serviceName: string
}

/**
 * Ambil seluruh pembayaran (ledger uang masuk) milik 1 klinik sejak tanggal
 * tertentu. Sumber otoritatif pendapatan = tabel `payments` (dibuat saat admin
 * konfirmasi pembayaran). Dipanggil dengan service client (lepas RLS) — KARENA
 * ITU clinicId WAJIB diisi agar tidak bocor lintas klinik.
 */
export async function fetchPayments(
  db: SupabaseClient,
  clinicId: string,
  fromISO?: string,
): Promise<PaymentRow[]> {
  let q = db
    .from('payments')
    .select(
      'amount, method, confirmed_at, created_at, booking:bookings(patient:patients(full_name), service_type:service_types(name), therapist:therapists(user:users(full_name)))',
    )
    .eq('clinic_id', clinicId)
    .order('confirmed_at', { ascending: false })

  if (fromISO) q = q.gte('confirmed_at', fromISO)

  const { data } = await q
  return (data ?? []).map((p: any) => ({
    amount: p.amount ?? 0,
    method: p.method ?? 'cash',
    confirmedAt: p.confirmed_at ?? p.created_at,
    therapistName: p.booking?.therapist?.user?.full_name ?? 'Terapis',
    patientName: p.booking?.patient?.full_name ?? 'Pasien',
    serviceName: p.booking?.service_type?.name ?? 'Layanan',
  }))
}

/** Deret pendapatan per bulan untuk `months` bulan terakhir (termasuk bulan ini). */
export function monthlyRevenueSeries(
  payments: PaymentRow[],
  months = 6,
): { label: string; revenue: number; key: string }[] {
  const now = new Date()
  const buckets: { label: string; revenue: number; key: string }[] = []
  const index = new Map<string, number>()

  for (let i = months - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i))
    const key = format(d, 'yyyy-MM')
    index.set(key, buckets.length)
    buckets.push({ label: format(d, 'MMM', { locale: localeID }), revenue: 0, key })
  }

  for (const p of payments) {
    if (!p.confirmedAt) continue
    const key = p.confirmedAt.slice(0, 7) // yyyy-MM
    const idx = index.get(key)
    if (idx !== undefined) buckets[idx].revenue += p.amount
  }
  return buckets
}

/** Total pendapatan per metode pembayaran. */
export function revenueByMethod(payments: PaymentRow[]): { name: string; value: number }[] {
  const labels: Record<string, string> = { qris: 'QRIS', transfer: 'Transfer', cash: 'Tunai', bpjs: 'BPJS' }
  const map = new Map<string, number>()
  for (const p of payments) map.set(p.method, (map.get(p.method) ?? 0) + p.amount)
  return Array.from(map.entries()).map(([k, v]) => ({ name: labels[k] ?? k, value: v }))
}
