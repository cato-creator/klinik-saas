import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, parseISO, addMinutes } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const therapist_id = searchParams.get('therapist_id')
  const date = searchParams.get('date')
  const service_type_id = searchParams.get('service_type_id')

  if (!therapist_id || !date) {
    return NextResponse.json({ error: 'Parameter therapist_id dan date wajib' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Ambil hari dalam seminggu dari tanggal yang dipilih
    const selectedDate = parseISO(date)
    const dayOfWeek = selectedDate.getDay()

    // Cek apakah terapis tidak tersedia di tanggal ini
    const { data: unavailable } = await supabase
      .from('therapist_unavailable')
      .select('id')
      .eq('therapist_id', therapist_id)
      .eq('date', date)
      .single()

    if (unavailable) {
      return NextResponse.json({ available_slots: [] })
    }

    // Ambil jadwal kerja terapis di hari ini
    const { data: schedule } = await supabase
      .from('therapist_schedules')
      .select('start_time, end_time')
      .eq('therapist_id', therapist_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single()

    if (!schedule) {
      return NextResponse.json({ available_slots: [] })
    }

    // Ambil durasi layanan
    let duration = 60
    if (service_type_id) {
      const { data: service } = await supabase
        .from('service_types')
        .select('duration_min')
        .eq('id', service_type_id)
        .single()
      if (service) duration = service.duration_min
    }

    // Ambil semua slot yang sudah terisi
    const { data: bookedSlots } = await supabase
      .from('bookings')
      .select('session_time')
      .eq('therapist_id', therapist_id)
      .eq('session_date', date)
      .not('status', 'eq', 'cancelled')

    const bookedTimes = new Set(
      (bookedSlots ?? []).map(b => b.session_time.slice(0, 5))
    )

    // Generate semua slot dari jam kerja
    const [startH, startM] = schedule.start_time.split(':').map(Number)
    const [endH, endM] = schedule.end_time.split(':').map(Number)

    const slots: string[] = []
    const baseDate = new Date()
    baseDate.setHours(startH, startM, 0, 0)

    const endDate = new Date()
    endDate.setHours(endH, endM, 0, 0)

    let current = baseDate
    while (current < endDate) {
      const slotEnd = addMinutes(current, duration)
      if (slotEnd <= endDate) {
        const timeStr = format(current, 'HH:mm')
        if (!bookedTimes.has(timeStr)) {
          slots.push(timeStr)
        }
      }
      current = addMinutes(current, duration)
    }

    return NextResponse.json({ available_slots: slots })
  } catch (error) {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
