import { apiTherapist } from '@/lib/tenant/api'
import { logMedicalAccess } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidDiscipline } from '@/lib/disciplines'

const schema = z.object({
  patient_id: z.string().uuid(),
  // Disiplin/layanan asesmen ini (dikirim oleh modul sesuai seksinya).
  discipline: z.string().optional(),
  // Form anamnesis terstruktur (SK Fisio) — disimpan utuh sebagai JSONB.
  data: z.record(z.string(), z.any()).optional(),
  // Field lama (dipertahankan untuk kompatibilitas).
  chief_complaint: z.string().optional(),
  history: z.string().optional(),
  physical_exam: z.string().optional(),
  rom: z.string().optional(),
  pain_scale: z.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const d = parsed.data

    // Isi ringkasan keluhan utama dari form anamnesis agar daftar/ringkasan
    // lama tetap menampilkan sesuatu yang berguna.
    const keluhanUtama =
      d.chief_complaint ||
      (typeof d.data?.keluhan_utama === 'string' ? (d.data.keluhan_utama as string) : '') ||
      null

    // Disiplin: utamakan disiplin terapis penulis (tepercaya); bila admin/owner
    // (tanpa disiplin), pakai yang dikirim modul; selain itu biarkan null.
    const discipline = isValidDiscipline(auth.therapistDiscipline)
      ? auth.therapistDiscipline
      : isValidDiscipline(d.discipline)
        ? d.discipline
        : null

    const { error } = await auth.db.from('assessments').insert({
      clinic_id: auth.clinicId,
      patient_id: d.patient_id,
      therapist_id: auth.therapistId,
      discipline,
      data: d.data ?? null,
      chief_complaint: keluhanUtama,
      history: d.history || null,
      physical_exam: d.physical_exam || null,
      rom: d.rom || null,
      pain_scale: d.pain_scale ?? null,
      notes: d.notes || null,
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
      .from('assessments')
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
        action: 'assessment.delete',
        entityType: 'assessment',
        entityId: row.id,
        patientId: row.patient_id,
      })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
