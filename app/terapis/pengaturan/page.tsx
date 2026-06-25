import { Settings } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { SettingsForm } from '@/components/terapis/settings-form'
import { ChangePasswordCard } from '@/components/ui/change-password-card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pengaturan — Terapis' }

export default async function PengaturanPage() {
  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  const db = createServiceClient()
  const { data: therapist } = await db
    .from('therapists')
    .select('photo_url, signature_url')
    .eq('user_id', ctx.userId)
    .eq('clinic_id', ctx.clinicId)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-500/30">
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Pengaturan Profil</h1>
          <p className="text-sm text-gray-500">Kelola nama, foto profil, dan tanda tangan Anda.</p>
        </div>
      </div>

      {therapist ? (
        <SettingsForm
          initialName={ctx.fullName}
          initialPhotoUrl={therapist.photo_url ?? null}
          initialSignatureUrl={therapist.signature_url ?? null}
        />
      ) : (
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-700">
          Akun ini belum terhubung dengan data terapis, sehingga foto profil & tanda tangan tidak dapat diatur.
          Hubungi owner untuk menautkan akun Anda sebagai terapis.
        </p>
      )}

      <ChangePasswordCard />
    </div>
  )
}
