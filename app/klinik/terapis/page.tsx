import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { UserCog, Award } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TherapistToggle } from '@/components/admin/therapist-toggle'
import { getInitials } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Manajemen Terapis — Admin' }

export default async function AdminTerapisPage() {
  const ctx = await requireTenantUser(['admin', 'owner'])

  const db = createServiceClient()
  const { data: therapists } = await db
    .from('therapists')
    .select('*, profile:users(full_name, phone:phone_number), schedules:therapist_schedules(count)')
    .eq('clinic_id', ctx.clinicId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Terapis</h1>
        <p className="text-sm text-gray-500 mt-1">{therapists?.length ?? 0} terapis terdaftar</p>
      </div>

      {!therapists || therapists.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState icon={UserCog} title="Belum ada terapis" className="py-16" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {therapists.map((t: any) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-700 font-semibold text-sm">{getInitials(t.profile?.full_name ?? '?')}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{t.profile?.full_name ?? '—'}</p>
                    {t.str_number && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Award className="h-3 w-3" /> {t.str_number}
                      </p>
                    )}
                  </div>
                </div>
                <TherapistToggle id={t.id} active={t.is_active} />
              </div>

              {t.specialization?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {t.specialization.map((s: string) => (
                    <Badge key={s} variant="blue">{s}</Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 text-xs text-gray-500">
                <span>{t.profile?.phone ?? 'No. HP belum diisi'}</span>
                <span>{t.schedules?.[0]?.count ?? 0} jadwal rutin</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
