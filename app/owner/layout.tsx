import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { requireTenantUser } from '@/lib/tenant/auth'
import OwnerNav from './owner-nav'
import AnnouncementBanner from '@/components/owner/announcement-banner'

export const metadata: Metadata = { title: 'Owner — Dashboard' }

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenantUser(['owner'])

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerNav clinicName={ctx.clinicName} fullName={ctx.fullName} />
      <div className="lg:ml-64">
        <main className="p-4 sm:p-6">
          <AnnouncementBanner />
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
