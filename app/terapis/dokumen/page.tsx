import { FileSignature } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { DocumentStudio } from '@/components/terapis/document-studio'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Surat & Invoice — Terapis' }

export default async function DokumenPage() {
  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  const db = createServiceClient()
  const [clinicRes, therapistRes] = await Promise.all([
    db.from('clinics').select('name, address, phone_number, logo_url').eq('id', ctx.clinicId).maybeSingle(),
    db.from('therapists').select('str_number, signature_url').eq('user_id', ctx.userId).eq('clinic_id', ctx.clinicId).maybeSingle(),
  ])

  const clinic = clinicRes.data ?? { name: ctx.clinicName, address: null, phone_number: null, logo_url: null }
  const therapist = {
    full_name: ctx.fullName,
    str_number: therapistRes.data?.str_number ?? null,
    signature_url: therapistRes.data?.signature_url ?? null,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30">
          <FileSignature className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Surat &amp; Invoice</h1>
          <p className="text-sm text-gray-500">Buat Surat Keterangan Sakit & Kwitansi reimburse berkop {clinic.name}.</p>
        </div>
      </div>

      <DocumentStudio clinic={clinic} therapist={therapist} />
    </div>
  )
}
