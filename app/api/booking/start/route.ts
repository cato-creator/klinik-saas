import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const booking_id = formData.get('booking_id') as string

    if (!booking_id) {
      return NextResponse.redirect(new URL('/terapis/dashboard', request.url), 303)
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/auth/login', request.url), 303)

    const { data: profile } = await supabase
      .from('users')
      .select('role, clinic_id')
      .eq('id', user.id)
      .single()
    if (!profile || !['therapist', 'admin', 'owner'].includes(profile.role) || !profile.clinic_id) {
      return NextResponse.redirect(new URL('/auth/login', request.url), 303)
    }

    // Role terverifikasi — update via service client (terapis tak punya UPDATE policy RLS).
    const db = createServiceClient()

    if (profile.role === 'therapist') {
      // Antrian per-klinik: terapis yang memulai pelayanan otomatis claim sesi ini.
      const { data: therapist } = await db
        .from('therapists')
        .select('id')
        .eq('user_id', user.id)
        .eq('clinic_id', profile.clinic_id)
        .single()
      if (therapist) {
        await db.from('bookings')
          .update({ status: 'in_progress', therapist_id: therapist.id })
          .eq('id', booking_id)
          .eq('clinic_id', profile.clinic_id)
      }
    } else {
      await db.from('bookings')
        .update({ status: 'in_progress' })
        .eq('id', booking_id)
        .eq('clinic_id', profile.clinic_id)
    }

    return NextResponse.redirect(new URL(`/terapis/catatan/${booking_id}`, request.url), 303)
  } catch {
    return NextResponse.redirect(new URL('/terapis/dashboard', request.url), 303)
  }
}
