import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidDiscipline, DEFAULT_DISCIPLINE } from '@/lib/disciplines'

const schema = z.object({
  role: z.enum(['admin', 'therapist']),
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  // khusus terapis
  discipline: z.string().optional(),
  specialization: z.array(z.string()).optional(),
  str_number: z.string().optional(),
  bio: z.string().optional(),
  photo_url: z.string().url().optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await apiTenant(['owner'])
    if (!auth.ok) return auth.res

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const d = parsed.data

    const db = createServiceClient()

    // 1. Buat akun auth (email langsung terkonfirmasi). Metadata role + clinic_id
    //    dipakai trigger handle_new_auth_user utk mengisi baris public.users.
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { full_name: d.full_name, role: d.role, clinic_id: auth.clinicId },
    })

    if (createErr) {
      if (/already/i.test(createErr.message)) {
        return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Gagal membuat akun: ' + createErr.message }, { status: 500 })
    }
    const userId = created.user.id

    // 2. Pastikan baris public.users benar (role, clinic_id, nama, HP). Upsert
    //    agar tetap konsisten walau trigger sudah mengisi sebagian.
    const { error: upErr } = await db
      .from('users')
      .upsert({
        id: userId,
        clinic_id: auth.clinicId,
        role: d.role,
        full_name: d.full_name,
        email: d.email,
        phone_number: d.phone || null,
        status: 'active',
        invited_by: auth.userId,
      })

    if (upErr) {
      return NextResponse.json({ error: 'Akun dibuat tapi profil gagal disimpan.' }, { status: 500 })
    }

    // 3. Bila terapis, buat baris di tabel therapists.
    if (d.role === 'therapist') {
      // Disiplin terapis menentukan template anamnesis pasiennya. Default ke tipe
      // utama klinik bila tidak dikirim / tidak valid.
      let discipline = isValidDiscipline(d.discipline) ? d.discipline! : ''
      if (!discipline) {
        const { data: clinic } = await db
          .from('clinics')
          .select('clinic_type, specializations')
          .eq('id', auth.clinicId)
          .maybeSingle()
        discipline =
          (clinic?.specializations as string[] | null)?.[0] ??
          clinic?.clinic_type ??
          DEFAULT_DISCIPLINE
      }

      const { error: tErr } = await db.from('therapists').insert({
        clinic_id: auth.clinicId,
        user_id: userId,
        discipline,
        specialization: d.specialization ?? [],
        str_number: d.str_number || null,
        bio: d.bio || null,
        photo_url: d.photo_url || null,
        is_active: true,
      })
      if (tErr) {
        return NextResponse.json({ error: 'Akun dibuat tapi data terapis gagal disimpan.' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

const delSchema = z.object({
  role: z.enum(['admin', 'therapist']),
  id: z.string().uuid(), // admin: users.id  |  therapist: therapists.id
})

// Hapus staf (admin / terapis) milik klinik ini.
// Terapis dengan riwayat booking atau rekam medis (soap_notes) TIDAK dihapus
// demi retensi data medis — owner diminta menonaktifkan saja (CLAUDE.md §9.1).
export async function DELETE(request: NextRequest) {
  try {
    const auth = await apiTenant(['owner'])
    if (!auth.ok) return auth.res

    const parsed = delSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    const d = parsed.data

    const db = createServiceClient()
    let userId: string

    if (d.role === 'therapist') {
      // Pastikan terapis ada & milik klinik ini.
      const { data: therapist } = await db
        .from('therapists')
        .select('user_id, clinic_id')
        .eq('id', d.id)
        .single()
      if (!therapist || therapist.clinic_id !== auth.clinicId) {
        return NextResponse.json({ error: 'Terapis tidak ditemukan' }, { status: 404 })
      }
      userId = therapist.user_id

      // Jaga retensi: jangan hard-delete bila ada riwayat booking / rekam medis.
      const [{ count: bookingCount }, { count: soapCount }] = await Promise.all([
        db.from('bookings').select('id', { count: 'exact', head: true }).eq('therapist_id', d.id),
        db.from('soap_notes').select('id', { count: 'exact', head: true }).eq('therapist_id', d.id),
      ])
      if ((bookingCount ?? 0) > 0 || (soapCount ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Terapis ini punya riwayat booking/rekam medis dan tidak bisa dihapus. Nonaktifkan saja.' },
          { status: 409 },
        )
      }
    } else {
      // admin — pastikan baris user ada, milik klinik ini, dan role admin.
      const { data: user } = await db
        .from('users')
        .select('clinic_id, role')
        .eq('id', d.id)
        .single()
      if (!user || user.clinic_id !== auth.clinicId || user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin tidak ditemukan' }, { status: 404 })
      }
      userId = d.id
    }

    // Lepas referensi FK yang akan memblok penghapusan (NO ACTION).
    await db.from('audit_logs').update({ actor_user_id: null }).eq('actor_user_id', userId)
    await db.from('users').update({ invited_by: null }).eq('invited_by', userId)

    // Hapus baris public.users → cascade ke therapists & therapist_schedules.
    const { error: delErr } = await db.from('users').delete().eq('id', userId)
    if (delErr) {
      return NextResponse.json({ error: 'Gagal menghapus: ' + delErr.message }, { status: 500 })
    }

    // Hapus akun auth agar email bisa dipakai ulang.
    try {
      await db.auth.admin.deleteUser(userId)
    } catch {
      // abaikan — baris profil sudah terhapus.
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
