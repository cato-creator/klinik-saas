import { apiTherapist } from '@/lib/tenant/api'
import { logMedicalAccess } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidDiscipline } from '@/lib/disciplines'

const createSchema = z.object({
  patient_id: z.string().uuid(),
  description: z.string().min(1),
  discipline: z.string().optional(),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['in_progress', 'achieved']),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

    const discipline = isValidDiscipline(auth.therapistDiscipline)
      ? auth.therapistDiscipline
      : isValidDiscipline(parsed.data.discipline)
        ? parsed.data.discipline
        : null

    const { error } = await auth.db.from('treatment_goals').insert({
      clinic_id: auth.clinicId,
      patient_id: parsed.data.patient_id,
      therapist_id: auth.therapistId,
      discipline,
      description: parsed.data.description,
    })
    if (error) return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

    const { error } = await auth.db
      .from('treatment_goals')
      .update({
        status: parsed.data.status,
        achieved_at: parsed.data.status === 'achieved' ? new Date().toISOString() : null,
      })
      .eq('id', parsed.data.id)
      .eq('clinic_id', auth.clinicId)
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
      .from('treatment_goals')
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
        action: 'goal.delete',
        entityType: 'goal',
        entityId: row.id,
        patientId: row.patient_id,
      })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
