import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { dayKeyOf, hourlySlots, todayJakarta, nowMinutesJakarta } from '@/lib/utils'

// Ketersediaan slot booking untuk SEBUAH tanggal di SEBUAH klinik.
// Slot dibangun dari jam operasional klinik (clinics.operating_hours) per hari,
// dipotong per jam, lalu ditandai `booked` bila sudah ada booking aktif pada jam itu
// dan `past` bila jamnya sudah lewat (khusus hari ini, menurut WIB).
// Dipakai oleh booking flow WEB publik (tidak untuk admin/owner).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get('clinic_id') ?? ''
    const date = searchParams.get('date') ?? ''

    if (!/^[0-9a-f-]{36}$/i.test(clinicId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 })
    }

    const db = createServiceClient()
    const { data: clinic } = await db
      .from('clinics')
      .select('status, operating_hours')
      .eq('id', clinicId)
      .maybeSingle()

    if (!clinic) return NextResponse.json({ error: 'Klinik tidak ditemukan' }, { status: 404 })
    if (clinic.status !== 'active') {
      return NextResponse.json({ open: false, closed: false, slots: [] })
    }

    const hours = (clinic.operating_hours ?? {}) as Record<string, string>
    const range = hours[dayKeyOf(date)]
    const allSlots = hourlySlots(range)

    // Hari klinik tutup (tidak ada jam operasional untuk hari itu).
    if (allSlots.length === 0) {
      return NextResponse.json({ open: false, closed: true, slots: [] })
    }

    // Booking aktif (apa pun terapisnya) pada tanggal ini → kunci jamnya (clinic-wide).
    const { data: existing } = await db
      .from('bookings')
      .select('session_time')
      .eq('clinic_id', clinicId)
      .eq('session_date', date)
      .neq('status', 'cancelled')

    const booked = new Set((existing ?? []).map((b) => String(b.session_time).slice(0, 5)))

    // Slot yang sudah lewat (hanya berlaku bila tanggal = hari ini menurut WIB).
    const isToday = date === todayJakarta()
    const nowMin = isToday ? nowMinutesJakarta() : -1

    const slots = allSlots.map((time) => {
      const [h, m] = time.split(':').map(Number)
      const past = isToday && h * 60 + m <= nowMin
      return { time, booked: booked.has(time), past }
    })

    return NextResponse.json({ open: true, closed: false, slots })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
