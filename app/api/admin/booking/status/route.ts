import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled']),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const auth = await apiTenant(['admin', 'owner'])
    if (!auth.ok) return auth.res

    const { booking_id, status } = parsed.data

    const db = createServiceClient()
    const { error } = await db
      .from('bookings')
      .update({ status })
      .eq('id', booking_id)
      .eq('clinic_id', auth.clinicId)

    if (error) {
      return NextResponse.json({ error: 'Gagal memperbarui status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Status diperbarui' })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
