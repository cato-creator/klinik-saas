import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { KelolaKlinik } from '@/components/owner/kelola-klinik'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Kelola Klinik — Owner' }

export default async function KelolaKlinikPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()

  const [therapistsRes, adminsRes, clinicRes] = await Promise.all([
    db.from('therapists')
      .select('id, specialization, discipline, str_number, bio, photo_url, is_active, user:users(full_name)')
      .eq('clinic_id', ctx.clinicId)
      .order('created_at', { ascending: true }),
    db.from('users')
      .select('id, full_name, phone_number, role')
      .eq('clinic_id', ctx.clinicId)
      .eq('role', 'admin')
      .order('created_at', { ascending: true }),
    db.from('clinics').select('specializations, clinic_type').eq('id', ctx.clinicId).maybeSingle(),
  ])

  const clinic = clinicRes.data
  const clinicSpecializations = (clinic?.specializations as string[] | null)?.length
    ? (clinic!.specializations as string[])
    : clinic?.clinic_type ? [clinic.clinic_type] : []

  const therapists = (therapistsRes.data ?? []).map((t: any) => ({
    id: t.id,
    full_name: t.user?.full_name ?? '—',
    specialization: t.specialization ?? [],
    discipline: t.discipline ?? null,
    str_number: t.str_number,
    bio: t.bio,
    photo_url: t.photo_url,
    is_active: t.is_active,
  }))
  const admins = (adminsRes.data ?? []).map((a: any) => ({
    id: a.id,
    full_name: a.full_name,
    phone: a.phone_number ?? null,
    role: a.role,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kelola Klinik</h1>
        <p className="mt-1 text-sm text-gray-500">Tambah admin & terapis, atur foto dan profil terapis yang tampil di landing page.</p>
      </div>
      <KelolaKlinik therapists={therapists} admins={admins} clinicSpecializations={clinicSpecializations} />
    </div>
  )
}
