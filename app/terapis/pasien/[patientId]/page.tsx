import { requireTenantUser } from '@/lib/tenant/auth'
import { PatientCaseView } from '@/components/terapis/patient-case-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rekam Medis Pasien — Terapis' }

export default async function PasienDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { patientId } = await params
  const { tab } = await searchParams

  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  return (
    <PatientCaseView
      patientId={patientId}
      role={ctx.role}
      userId={ctx.userId}
      clinicId={ctx.clinicId}
      initialTab={tab ?? 'riwayat'}
      backHref="/terapis/pasien"
      backLabel="Kembali ke Rekam Medis"
    />
  )
}
