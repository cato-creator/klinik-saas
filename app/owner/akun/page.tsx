import { requireTenantUser } from '@/lib/tenant/auth'
import { ChangePasswordCard } from '@/components/ui/change-password-card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ganti Password — Owner' }

export default async function OwnerAkunPage() {
  await requireTenantUser(['owner'])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ganti Password</h1>
        <p className="mt-1 text-sm text-gray-500">Perbarui password login akun owner Anda.</p>
      </div>
      <ChangePasswordCard />
    </div>
  )
}
