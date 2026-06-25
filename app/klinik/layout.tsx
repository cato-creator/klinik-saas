import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { requireTenantUser } from '@/lib/tenant/auth'
import { SidebarNav } from '@/components/ui/sidebar-nav'
import { AdminShell } from '@/components/admin/admin-shell'
import OwnerNav from '../owner/owner-nav'
import {
  LayoutDashboard, CalendarDays, Users, UserCog, Calendar, KeyRound, LogOut,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Dashboard' }

const iconCls = 'h-4 w-4'
const navItems = [
  { href: '/klinik/dashboard', label: 'Dashboard', icon: <LayoutDashboard className={iconCls} /> },
  { href: '/klinik/booking', label: 'Semua Booking', icon: <CalendarDays className={iconCls} /> },
  { href: '/klinik/pasien', label: 'Data Pasien', icon: <Users className={iconCls} /> },
  { href: '/klinik/terapis', label: 'Manajemen Terapis', icon: <UserCog className={iconCls} /> },
  { href: '/klinik/jadwal', label: 'Kalender Jadwal', icon: <Calendar className={iconCls} /> },
  { href: '/klinik/akun', label: 'Ganti Password', icon: <KeyRound className={iconCls} /> },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenantUser(['admin', 'owner'])

  // OWNER: pakai sidebar yang SAMA persis dengan area /owner (OwnerNav). Tanpa ini,
  // owner yang membuka menu "Operasional" (link ke /klinik/*) akan masuk layout admin
  // dgn struktur menu berbeda → menu terasa pindah-pindah / kategori menumpuk dan
  // "Dashboard Admin" berubah jadi "Dashboard". Dengan OwnerNav, menu konsisten.
  if (ctx.role === 'owner') {
    return (
      <div className="min-h-screen bg-gray-50">
        <OwnerNav clinicName={ctx.clinicName} fullName={ctx.fullName} />
        <div className="lg:ml-64">
          <main className="p-4 sm:p-6">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    )
  }

  // ADMIN: sidebar khusus area operasional klinik.
  const sidebar = (
    <>
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{ctx.clinicName?.[0]?.toUpperCase() ?? 'K'}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{ctx.clinicName}</p>
            <p className="text-xs text-gray-400 capitalize">{ctx.role}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <SidebarNav items={navItems} />
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
            <span className="text-teal-700 font-semibold text-xs">
              {ctx.fullName?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 truncate">{ctx.fullName}</span>
        </div>
        <form action="/auth/signout" method="post">
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </form>
      </div>
    </>
  )

  return (
    <AdminShell clinicName={ctx.clinicName} sidebar={sidebar}>
      {children}
    </AdminShell>
  )
}
