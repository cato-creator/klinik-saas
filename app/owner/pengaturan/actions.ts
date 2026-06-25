'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantUser } from '@/lib/tenant/auth'
import { createServiceClient } from '@/lib/supabase/server'

export type PengaturanResult = { ok: boolean; error?: string; info?: string }

// Simpan komitmen fee booking online (rupiah, >= 0). Hanya owner.
export async function saveBookingFee(
  _prev: PengaturanResult | null,
  formData: FormData,
): Promise<PengaturanResult> {
  const ctx = await requireTenantUser(['owner'])

  // Ambil angka murni dari input (boleh berpemisah titik), validasi.
  const raw = String(formData.get('online_booking_fee') ?? '').replace(/\D/g, '')
  const fee = raw ? Number(raw) : 0
  if (!Number.isFinite(fee) || fee < 0) {
    return { ok: false, error: 'Nominal tidak valid.' }
  }
  if (fee > 100_000_000) {
    return { ok: false, error: 'Nominal terlalu besar.' }
  }

  // Info rekening pembayaran (opsional) — ditampilkan ke pasien saat booking.
  const clean = (v: FormDataEntryValue | null) => {
    const t = String(v ?? '').trim()
    return t === '' ? null : t.slice(0, 120)
  }
  const payment_bank = clean(formData.get('payment_bank'))
  const payment_account_name = clean(formData.get('payment_account_name'))
  const payment_account_number = clean(formData.get('payment_account_number'))

  const db = createServiceClient()
  const { error } = await db
    .from('clinics')
    .update({ online_booking_fee: fee, payment_bank, payment_account_name, payment_account_number })
    .eq('id', ctx.clinicId)

  if (error) {
    // Pesan ramah bila migrasi 0016 (kolom rekening) belum dijalankan.
    if (/column .* does not exist/i.test(error.message)) {
      return { ok: false, error: 'Kolom rekening belum ada. Jalankan migrasi 0016_clinic_payment_info.sql di Supabase dulu.' }
    }
    return { ok: false, error: `Gagal menyimpan: ${error.message}` }
  }

  revalidatePath('/owner/pengaturan')
  return { ok: true, info: 'Pengaturan booking & rekening disimpan.' }
}
