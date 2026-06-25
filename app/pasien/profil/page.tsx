import { ChangePasswordCard } from '@/components/ui/change-password-card'

export const metadata = { title: 'Profil Saya — Pasien' }

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
        <p className="mt-1 text-sm text-gray-500">Kelola keamanan akun Anda.</p>
      </div>
      <ChangePasswordCard />
    </div>
  )
}
