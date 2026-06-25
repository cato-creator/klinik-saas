import { apiTherapist } from '@/lib/tenant/api'
import { logMedicalAccess } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  patient_id: z.string().uuid(),
  icd10_code: z.string().optional(),
  description: z.string().min(1),
  dx_type: z.enum(['primary', 'secondary']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

    const { error } = await auth.db.from('diagnoses').insert({
      clinic_id: auth.clinicId,
      patient_id: parsed.data.patient_id,
      therapist_id: auth.therapistId,
      icd10_code: parsed.data.icd10_code || null,
      description: parsed.data.description,
      dx_type: parsed.data.dx_type ?? 'primary',
    })
    if (error) return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const { id } = await request.json()
    if (typeof id !== 'string') return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    // SOFT DELETE (retensi data medis §9.1).
    const { data: row } = await auth.db
      .from('diagnoses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', auth.clinicId)
      .is('deleted_at', null)
      .select('id, patient_id')
      .maybeSingle()
    if (row) {
      await logMedicalAccess({
        actorUserId: auth.userId,
        actorRole: auth.role,
        clinicId: auth.clinicId,
        action: 'diagnosis.delete',
        entityType: 'diagnosis',
        entityId: row.id,
        patientId: row.patient_id,
      })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
