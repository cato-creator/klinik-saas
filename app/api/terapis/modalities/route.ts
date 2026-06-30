// ============================================================
// Tindakan/modalitas CUSTOM per KLINIK & per DISIPLIN (di luar daftar bawaan).
// Dipakai bersama semua terapis profesi sama di klinik. Bukan data medis
// pasien → boleh hard-delete. Tulis/baca via service role, di-scope clinic_id.
// ============================================================
import { apiTherapist } from '@/lib/tenant/api'
import { isValidDiscipline } from '@/lib/disciplines'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// GET /api/terapis/modalities?discipline=fisioterapi
export async function GET(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const discipline = request.nextUrl.searchParams.get('discipline') ?? ''
    if (!isValidDiscipline(discipline)) return NextResponse.json({ modalities: [] })

    const { data, error } = await auth.db
      .from('clinic_modalities')
      .select('id, name')
      .eq('clinic_id', auth.clinicId)
      .eq('discipline', discipline)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: 'Gagal memuat tindakan' }, { status: 500 })
    return NextResponse.json({ modalities: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

const createSchema = z.object({
  discipline: z.string(),
  name: z.string().trim().min(1).max(60),
})

// POST /api/terapis/modalities  { discipline, name }
export async function POST(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const d = parsed.data
    if (!isValidDiscipline(d.discipline)) return NextResponse.json({ error: 'Disiplin tidak valid' }, { status: 400 })

    const { data: row, error } = await auth.db
      .from('clinic_modalities')
      .upsert(
        { clinic_id: auth.clinicId, discipline: d.discipline, name: d.name, created_by: auth.userId },
        { onConflict: 'clinic_id,discipline,name', ignoreDuplicates: false },
      )
      .select('id, name')
      .single()
    if (error) return NextResponse.json({ error: 'Gagal menyimpan tindakan' }, { status: 500 })
    return NextResponse.json({ modality: row })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// DELETE /api/terapis/modalities  { id }
export async function DELETE(request: NextRequest) {
  try {
    const auth = await apiTherapist()
    if (!auth.ok) return auth.res
    const { id } = await request.json()
    if (typeof id !== 'string') return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const { error } = await auth.db
      .from('clinic_modalities')
      .delete()
      .eq('id', id)
      .eq('clinic_id', auth.clinicId)
    if (error) return NextResponse.json({ error: 'Gagal menghapus tindakan' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
