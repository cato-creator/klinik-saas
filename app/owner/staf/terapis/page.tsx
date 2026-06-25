import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { KelolaKlinik } from '@/components/owner/kelola-klinik'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tambah Terapis — Owner' }

export default async function TambahTerapisPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()

  const [{ data }, { data: clinic }] = await Promise.all([
    db.from('therapists')
      .select('id, specialization, discipline, str_number, bio, photo_url, is_active, user:users(full_name)')
      .eq('clinic_id', ctx.clinicId)
      .order('created_at', { ascending: true }),
    db.from('clinics').select('specializations, clinic_type').eq('id', ctx.clinicId).maybeSingle(),
  ])
  const clinicSpecializations = (clinic?.specializations as string[] | null)?.length
    ? (clinic!.specializations as string[])
    : clinic?.clinic_type ? [clinic.clinic_type] : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const therapists = (data ?? []).map((t: any) => ({
    id: t.id,
    full_name: t.user?.full_name ?? '—',
    specialization: t.specialization ?? [],
    discipline: t.discipline ?? null,
    str_number: t.str_number,
    bio: t.bio,
    photo_url: t.photo_url,
    is_active: t.is_active,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tambah Terapis</h1>
        <p className="mt-1 text-sm text-gray-500">Buat akun terapis baru, atur foto & profil yang tampil di landing page.</p>
      </div>
      <KelolaKlinik therapists={therapists} admins={[]} mode="therapist" clinicSpecializations={clinicSpecializations} />
    </div>
  )
}
