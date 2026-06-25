import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// PATCH data pasien oleh terapis/admin/owner. Mencakup:
//  - Data klinis: special_alert, session_package (dipakai ClinicalEdit).
//  - Identitas: full_name, phone, email, birth_date, gender, guardian_name, notes
//    (dipakai IdentityEdit). No. RM TIDAK bisa diubah (identitas permanen).
// Field yang TIDAK dikirim tidak akan disentuh (build update kondisional), supaya
// satu form tidak menimpa field milik form lain.
const schema = z.object({
  patient_id: z.string().uuid(),
  full_name: z.string().min(2).max(120).optional(),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().max(160).optional().nullable(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).nullable(),
  gender: z.enum(['L', 'P']).optional().nullable(),
  guardian_name: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  special_alert: z.string().optional().nullable(),
  session_package: z.number().int().min(0).max(999).optional().nullable(),
})

export async function PATCH(request: NextRequest) {
  try {
    const auth = await apiTenant(['therapist', 'admin', 'owner'])
    if (!auth.ok) return auth.res

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const d = parsed.data

    // Hanya set field yang benar-benar dikirim (undefined = jangan sentuh).
    const update: Record<string, unknown> = {}
    if (d.full_name !== undefined) update.full_name = d.full_name.trim()
    if (d.phone !== undefined) update.phone = d.phone.trim()
    if (d.email !== undefined) update.email = (d.email ?? '').trim() || null
    if (d.birth_date !== undefined) update.birth_date = d.birth_date || null
    if (d.gender !== undefined) update.gender = d.gender || null
    if (d.guardian_name !== undefined) update.guardian_name = (d.guardian_name ?? '').trim() || null
    if (d.notes !== undefined) update.notes = (d.notes ?? '').trim() || null
    if (d.special_alert !== undefined) update.special_alert = (d.special_alert ?? '').trim() || null
    if (d.session_package !== undefined) update.session_package = d.session_package || null

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
    }

    const db = createServiceClient()
    const { error } = await db
      .from('patients')
      .update(update)
      .eq('id', d.patient_id)
      .eq('clinic_id', auth.clinicId)
    if (error) {
      // Unique partial index (clinic_id, phone, lower(full_name)) — bentrok dgn
      // pasien lain yg nama & No. HP-nya sama persis.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Sudah ada pasien lain dengan nama & No. HP yang sama di klinik ini.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
