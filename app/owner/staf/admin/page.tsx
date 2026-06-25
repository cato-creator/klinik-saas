import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { KelolaKlinik } from '@/components/owner/kelola-klinik'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tambah Admin — Owner' }

export default async function TambahAdminPage() {
  const ctx = await requireTenantUser(['owner'])
  const db = createServiceClient()

  const { data } = await db
    .from('users')
    .select('id, full_name, phone_number, role')
    .eq('clinic_id', ctx.clinicId)
    .eq('role', 'admin')
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admins = (data ?? []).map((a: any) => ({
    id: a.id,
    full_name: a.full_name,
    phone: a.phone_number ?? null,
    role: a.role,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tambah Admin</h1>
        <p className="mt-1 text-sm text-gray-500">Buat akun admin baru untuk membantu operasional klinik.</p>
      </div>
      <KelolaKlinik therapists={[]} admins={admins} mode="admin" />
    </div>
  )
}
