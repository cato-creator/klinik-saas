// ============================================================
// Template kasus BUATAN SENDIRI (mode cepat asesmen/anamnesis).
// Dibagi per KLINIK & per DISIPLIN. Hanya staf klinik (therapist/admin/owner)
// yang bisa list/buat/hapus, selalu di-scope ke clinic_id sesi (service role).
// Bukan data medis pasien → boleh hard-delete.
// ============================================================
import { apiTherapist } from '@/lib/tenant/api'
import { isValidDiscipline } from '@/lib/disciplines'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// GET /api/terapis/case-templates?discipline=fisioterapi
export async function GET(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const discipline = request.nextUrl.searchParams.get('discipline') ?? ''
    if (!isValidDiscipline(discipline)) return NextResponse.json({ templates: [] })

    const { data, error } = await auth.db
      .from('assessment_case_templates')
      .select('id, name, emoji, data')
      .eq('clinic_id', auth.clinicId)
      .eq('discipline', discipline)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: 'Gagal memuat template' }, { status: 500 })
    return NextResponse.json({ templates: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

const createSchema = z.object({
  discipline: z.string(),
  name: z.string().trim().min(1).max(80),
  emoji: z.string().trim().max(8).optional().nullable(),
  data: z.record(z.string(), z.any()).default({}),
})

// POST /api/terapis/case-templates
export async function POST(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const d = parsed.data
    if (!isValidDiscipline(d.discipline)) return NextResponse.json({ error: 'Disiplin tidak valid' }, { status: 400 })

    const { data: row, error } = await auth.db
      .from('assessment_case_templates')
      .insert({
        clinic_id: auth.clinicId,
        discipline: d.discipline,
        name: d.name,
        emoji: d.emoji || null,
        data: d.data ?? {},
        created_by: auth.userId,
      })
      .select('id, name, emoji, data')
      .single()
    if (error) return NextResponse.json({ error: 'Gagal menyimpan template' }, { status: 500 })
    return NextResponse.json({ template: row })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// DELETE /api/terapis/case-templates  { id }
export async function DELETE(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const { id } = await request.json()
    if (typeof id !== 'string') return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const { error } = await auth.db
      .from('assessment_case_templates')
      .delete()
      .eq('id', id)
      .eq('clinic_id', auth.clinicId)
    if (error) return NextResponse.json({ error: 'Gagal menghapus template' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
