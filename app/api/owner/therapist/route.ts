import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidDiscipline } from '@/lib/disciplines'

const schema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2),
  discipline: z.string().optional(),
  specialization: z.array(z.string()).optional(),
  str_number: z.string().optional(),
  bio: z.string().optional(),
  photo_url: z.string().url().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const auth = await apiTenant(['owner'])
    if (!auth.ok) return auth.res

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const d = parsed.data

    const db = createServiceClient()

    // Pastikan terapis ada DAN milik klinik ini (cegah lintas-klinik).
    const { data: therapist } = await db
      .from('therapists')
      .select('user_id, clinic_id')
      .eq('id', d.id)
      .single()
    if (!therapist || therapist.clinic_id !== auth.clinicId) {
      return NextResponse.json({ error: 'Terapis tidak ditemukan' }, { status: 404 })
    }

    // Update tabel therapists.
    await db
      .from('therapists')
      .update({
        specialization: d.specialization ?? [],
        ...(isValidDiscipline(d.discipline) ? { discipline: d.discipline } : {}),
        str_number: d.str_number || null,
        bio: d.bio || null,
        photo_url: d.photo_url || null,
        ...(d.is_active !== undefined ? { is_active: d.is_active } : {}),
      })
      .eq('id', d.id)

    // Nama disimpan di users → jaga konsistensi dengan landing page.
    await db.from('users').update({ full_name: d.full_name }).eq('id', therapist.user_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
