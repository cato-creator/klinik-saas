import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  therapist_id: z.string().uuid(),
  is_active: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const auth = await apiTenant(['admin', 'owner'])
    if (!auth.ok) return auth.res

    const { therapist_id, is_active } = parsed.data
    const db = createServiceClient()
    const { error } = await db
      .from('therapists')
      .update({ is_active })
      .eq('id', therapist_id)
      .eq('clinic_id', auth.clinicId)

    if (error) {
      return NextResponse.json({ error: 'Gagal memperbarui terapis' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
