import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateBookingCode, normalizePhone, phoneVariants, normalizeName, normalizeRM, dayKeyOf, parseHoursRange } from '@/lib/utils'
import { isValidDiscipline, DEFAULT_DISCIPLINE } from '@/lib/disciplines'

const bookingSchema = z.object({
  // Pasien BARU: kirim objek `patient`. Pasien LAMA: kirim `medical_record_no`
  // (No. RM) saja. Salah satu wajib (kecuali pasien yang sedang login).
  patient: z.object({
    full_name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email().optional().or(z.literal('')),
    birth_date: z.string().optional(),
    gender: z.enum(['L', 'P']).optional(),
    guardian_name: z.string().optional(),
  }).optional(),
  medical_record_no: z.string().trim().min(1).optional(),
  // No. HP untuk verifikasi pasien lama dari WEB publik (wajib cocok dgn HP
  // pasien). Tidak diperlukan saat dibuat admin (tepercaya).
  verify_phone: z.string().optional(),
  therapist_id: z.string().uuid().optional().nullable(),
  service_type_id: z.string().uuid().optional().nullable(),
  // Disiplin/layanan yang dipilih (mis. 'fisioterapi'/'okupasi_terapi'). Menentukan
  // template anamnesis pasien. Diabaikan bila klinik hanya membuka satu layanan.
  discipline: z.string().optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes_patient: z.string().optional(),
  profile_id: z.string().uuid().optional(),
  clinic_id: z.string().uuid().optional(), // diisi guest booking (dari subdomain)
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bookingSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }
    const data = parsed.data
    const db = createServiceClient()

    // ---- Resolusi klinik ----
    // 1) Bila ada user login (admin/owner/pasien), pakai clinic_id-nya (tepercaya).
    // 2) Bila guest, pakai clinic_id dari body lalu validasi.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let clinicId: string | null = null
    let createdByRole = 'guest'
    let authedPatientUserId: string | null = null

    if (user) {
      const { data: profile } = await db.from('users').select('clinic_id, role').eq('id', user.id).maybeSingle()
      if (profile?.clinic_id) {
        clinicId = profile.clinic_id
        createdByRole = profile.role === 'patient' ? 'patient' : 'admin'
        if (profile.role === 'patient') authedPatientUserId = user.id
      }
    }
    if (!clinicId) {
      clinicId = data.clinic_id ?? null
      createdByRole = 'guest'
    }
    if (!clinicId) {
      return NextResponse.json({ error: 'Klinik tidak diketahui' }, { status: 400 })
    }

    // Validasi klinik aktif.
    const { data: clinic } = await db.from('clinics').select('id, status, online_booking_fee, operating_hours, specializations, clinic_type').eq('id', clinicId).maybeSingle()
    if (!clinic) return NextResponse.json({ error: 'Klinik tidak ditemukan' }, { status: 404 })
    if (clinic.status !== 'active') {
      return NextResponse.json({ error: 'Booking online sedang tidak tersedia' }, { status: 403 })
    }

    // Disiplin/layanan booking → menentukan `patients.discipline` (form anamnesis).
    // - Klinik 1 layanan: selalu pakai layanan itu (abaikan input).
    // - Klinik >1 layanan: pakai pilihan bila valid & dibuka klinik, else tipe utama.
    const clinicSpecs = ((clinic.specializations as string[] | null) ?? []).filter(Boolean)
    const primaryType = clinic.clinic_type ?? clinicSpecs[0] ?? DEFAULT_DISCIPLINE
    let bookingDiscipline: string
    if (clinicSpecs.length <= 1) {
      bookingDiscipline = clinicSpecs[0] ?? primaryType
    } else if (isValidDiscipline(data.discipline) && clinicSpecs.includes(data.discipline!)) {
      bookingDiscipline = data.discipline!
    } else {
      bookingDiscipline = primaryType
    }

    // Layanan kini OPSIONAL (tidak dipilih saat booking). Bila dikirim (mis. dari
    // dashboard admin), validasi milik klinik ini & pakai harga/durasinya.
    // Bila tidak ada, biarkan null — durasi default 60 & biaya 0 ditentukan admin.
    let service: { price: number; duration_min: number } | null = null
    if (data.service_type_id) {
      const { data: svc } = await db
        .from('service_types')
        .select('price, duration_min, clinic_id')
        .eq('id', data.service_type_id)
        .eq('clinic_id', clinicId)
        .maybeSingle()
      if (!svc) return NextResponse.json({ error: 'Jenis layanan tidak ditemukan' }, { status: 404 })
      service = { price: svc.price, duration_min: svc.duration_min }
    }

    // Validasi terapis (bila dipilih) milik klinik ini.
    if (data.therapist_id) {
      const { data: th } = await db
        .from('therapists')
        .select('id')
        .eq('id', data.therapist_id)
        .eq('clinic_id', clinicId)
        .maybeSingle()
      if (!th) return NextResponse.json({ error: 'Terapis tidak ditemukan' }, { status: 404 })
    }

    // ---- Validasi slot waktu ----
    // Booking WEB (guest/pasien) memilih jam dari slot yang mengikuti jam operasional
    // klinik; jam yang sudah terisi dikunci CLINIC-WIDE. Booking ADMIN/OWNER TIDAK
    // mengikuti skema ini (mereka isi jam bebas / belum dijadwalkan).
    const hasTime = data.session_time !== '00:00'
    if (createdByRole !== 'admin' && hasTime) {
      // 1) Jam harus berada di dalam jam operasional klinik untuk hari itu.
      const oh = (clinic.operating_hours ?? {}) as Record<string, string>
      const range = parseHoursRange(oh[dayKeyOf(data.session_date)])
      const [hh, mm] = data.session_time.split(':').map(Number)
      const slotMin = hh * 60 + mm
      if (!range || slotMin < range[0] || slotMin + 60 > range[1]) {
        return NextResponse.json({ error: 'Jam yang dipilih di luar jam operasional klinik.' }, { status: 400 })
      }

      // 2) Tidak boleh bentrok dengan booking aktif lain pada jam yang sama (clinic-wide).
      const { data: clash } = await db
        .from('bookings')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('session_date', data.session_date)
        .eq('session_time', data.session_time + ':00')
        .neq('status', 'cancelled')
        .limit(1)
        .maybeSingle()
      if (clash) {
        return NextResponse.json({ error: 'Slot waktu ini sudah terisi. Pilih waktu lain.' }, { status: 409 })
      }
    } else if (hasTime && data.therapist_id) {
      // Admin menjadwalkan jam + terapis: cegah dobel-booking terapis yang sama.
      const { data: existingBooking } = await db
        .from('bookings')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('therapist_id', data.therapist_id)
        .eq('session_date', data.session_date)
        .eq('session_time', data.session_time + ':00')
        .neq('status', 'cancelled')
        .maybeSingle()
      if (existingBooking) {
        return NextResponse.json({ error: 'Slot waktu ini sudah terisi. Pilih waktu lain.' }, { status: 409 })
      }
    }

    // ---- Tentukan pasien: login → No. RM (pasien lama) → data (pasien baru) ----
    let patientId: string | null = null

    if (authedPatientUserId) {
      const { data: existing } = await db
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('user_id', authedPatientUserId)
        .maybeSingle()
      if (existing) patientId = existing.id
    }

    // PASIEN LAMA: cari berdasar No. RM (dalam klinik ini, belum dihapus).
    if (!patientId && data.medical_record_no) {
      const rm = normalizeRM(data.medical_record_no)
      const { data: byRm } = await db
        .from('patients')
        .select('id, phone')
        .eq('clinic_id', clinicId)
        .eq('medical_record_no', rm)
        .is('deleted_at', null)
        .maybeSingle()
      if (!byRm) {
        return NextResponse.json({ error: 'No. RM tidak ditemukan di klinik ini.' }, { status: 404 })
      }
      // Dari WEB publik (guest) WAJIB verifikasi No. HP cocok dgn pasien — cegah
      // orang memesan atas nama pasien lain hanya dgn menebak No. RM (sekuensial).
      // Admin (tepercaya) tidak perlu. Pesan error tidak membedakan RM vs HP salah
      // (hindari enumerasi). Cocokkan lewat semua varian format nomor.
      if (createdByRole !== 'admin') {
        const provided = data.verify_phone ?? ''
        const stored = new Set(phoneVariants(byRm.phone ?? ''))
        const ok = provided.trim().length > 0 && phoneVariants(provided).some((v) => stored.has(v))
        if (!ok) {
          return NextResponse.json({ error: 'No. RM atau No. HP tidak cocok.' }, { status: 403 })
        }
      }
      patientId = byRm.id
    }

    // PASIEN BARU (atau dedup orang yang sama): butuh objek `patient`.
    if (!patientId) {
      if (!data.patient) {
        return NextResponse.json({ error: 'Data pasien belum lengkap.' }, { status: 400 })
      }
      const p = data.patient
      // Dedup by (nomor HP + NAMA): orang yang SAMA (beda format nomor, via web
      // atau admin) dikenali satu pasien (No. RM sama); nomor SAMA tapi nama BEDA
      // (mis. ortu daftarkan beberapa anak dgn 1 HP) = pasien BERBEDA (migrasi 0011).
      // Nomor disimpan kanonik (+62...) untuk data baru.
      const phoneCanonical = normalizePhone(p.phone)
      const phoneCandidates = phoneVariants(p.phone)
      const nameKey = normalizeName(p.full_name)

      const { data: byPhone } = await db
        .from('patients')
        .select('id, full_name')
        .eq('clinic_id', clinicId)
        .in('phone', phoneCandidates)
        .order('created_at', { ascending: true })
      const match = (byPhone ?? []).find((x) => normalizeName(x.full_name) === nameKey)
      if (match) patientId = match.id

      if (!patientId) {
        const { data: newPatient, error: patientError } = await db
          .from('patients')
          .insert({
            clinic_id: clinicId,
            user_id: authedPatientUserId,
            full_name: p.full_name,
            phone: phoneCanonical,
            email: p.email || null,
            birth_date: p.birth_date || null,
            gender: p.gender ?? null,
            guardian_name: p.guardian_name || null,
            discipline: bookingDiscipline,
            source: createdByRole === 'admin' ? 'manual_admin' : 'guest_booking',
          })
          .select('id')
          .single()
        if (patientError || !newPatient) {
          // Balapan (HP+nama sama nyaris bersamaan) menabrak unique index → ambil ulang.
          const { data: again } = await db
            .from('patients')
            .select('id, full_name')
            .eq('clinic_id', clinicId)
            .in('phone', phoneCandidates)
            .order('created_at', { ascending: true })
          const m = (again ?? []).find((x) => normalizeName(x.full_name) === nameKey)
          if (m) patientId = m.id
          else return NextResponse.json({ error: 'Gagal menyimpan data pasien' }, { status: 500 })
        } else {
          patientId = newPatient.id
        }
      }
    }

    // Set disiplin pasien bila belum ada (pasien lama / backfill) — TIDAK menimpa
    // disiplin yang sudah terisi, agar riwayat anamnesis pasien tetap konsisten.
    if (patientId) {
      await db.from('patients').update({ discipline: bookingDiscipline }).eq('id', patientId).is('discipline', null)
    }

    // Harga awal booking:
    //  - Booking lewat WEBSITE (guest / pasien login) → komitmen fee klinik.
    //  - Booking manual oleh admin → 0 (admin input harga saat konfirmasi).
    //  - Bila layanan dikirim (jarang, dari dashboard) → harga layanan diutamakan.
    const onlineFee = createdByRole === 'admin' ? 0 : Number(clinic.online_booking_fee ?? 0)
    const initialAmount = service?.price ?? onlineFee

    // ---- Buat booking ----
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .insert({
        clinic_id: clinicId,
        booking_code: generateBookingCode(),
        patient_id: patientId,
        therapist_id: data.therapist_id ?? null,
        service_type_id: data.service_type_id ?? null,
        // Disiplin kunjungan ini (menentukan label & form anamnesis kunjungan).
        discipline: bookingDiscipline,
        session_date: data.session_date,
        session_time: data.session_time + ':00',
        duration_min: service?.duration_min ?? 60,
        amount: initialAmount,
        notes_patient: data.notes_patient || null,
        created_by_role: createdByRole,
        // Booking yang dibuat admin/owner langsung TERKONFIRMASI (mereka tepercaya);
        // booking dari website (guest/pasien) tetap 'pending' menunggu konfirmasi.
        // Harga & pembayaran tetap diinput admin via tombol "Konfirmasi" (payment_status unpaid).
        status: createdByRole === 'admin' ? 'confirmed' : 'pending',
        payment_status: 'unpaid',
      })
      .select('id, booking_code, amount')
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Gagal membuat booking' }, { status: 500 })
    }

    return NextResponse.json({
      booking_id: booking.id,
      booking_code: booking.booking_code,
      amount: booking.amount,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
