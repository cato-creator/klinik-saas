import type { Metadata } from 'next'
import { requireTenantUser } from '@/lib/tenant/auth'
import { DashboardShell } from '@/components/ui/dashboard-shell'
import { LayoutDashboard, User } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard Pasien' }

const iconCls = 'h-4 w-4'
const navItems = [
  { href: '/pasien/dashboard', label: 'Dashboard', icon: <LayoutDashboard className={iconCls} /> },
  { href: '/pasien/profil', label: 'Profil Saya', icon: <User className={iconCls} /> },
]

export default async function PasienLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenantUser(['patient', 'admin', 'owner'])

  return (
    <DashboardShell
      navItems={navItems}
      clinicName={ctx.clinicName}
      fullName={ctx.fullName}
      roleLabel="Pasien"
    >
      {children}
    </DashboardShell>
  )
}
