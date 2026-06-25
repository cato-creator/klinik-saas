import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeRM, phoneVariants } from '@/lib/utils'

// Verifikasi pasien LAMA (No. RM + No. HP) SEBELUM melanjutkan booking dari website.
// Mengembalikan nama pasien bila cocok. Pesan gagal SAMA untuk RM salah / HP salah
// (anti-enumerasi). Tetap di-validasi ulang saat submit di /api/booking (defense-in-depth).
const schema = z.object({
  clinic_id: z.string().uuid(),
  medical_record_no: z.string().trim().min(1),
  verify_phone: z.string().trim().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Data tidak valid' }, { status: 400 })
    }
    const { clinic_id, medical_record_no, verify_phone } = parsed.data
    const db = createServiceClient()

    // Klinik harus aktif.
    const { data: clinic } = await db.from('clinics').select('id, status').eq('id', clinic_id).maybeSingle()
    if (!clinic) return NextResponse.json({ ok: false, error: 'Klinik tidak ditemukan' }, { status: 404 })
    if (clinic.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'Booking online sedang tidak tersedia' }, { status: 403 })
    }

    const rm = normalizeRM(medical_record_no)
    const { data: patient } = await db
      .from('patients')
      .select('full_name, phone')
      .eq('clinic_id', clinic_id)
      .eq('medical_record_no', rm)
      .is('deleted_at', null)
      .maybeSingle()

    // Gagal cocok → pesan generik (jangan bedakan RM vs HP, hindari enumerasi).
    const fail = NextResponse.json({ ok: false, error: 'No. RM atau No. HP tidak cocok.' }, { status: 200 })
    if (!patient) return fail
    const stored = new Set(phoneVariants(patient.phone ?? ''))
    const matched = phoneVariants(verify_phone).some((v) => stored.has(v))
    if (!matched) return fail

    return NextResponse.json({ ok: true, name: patient.full_name })
  } catch {
    return NextResponse.json({ ok: false, error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
