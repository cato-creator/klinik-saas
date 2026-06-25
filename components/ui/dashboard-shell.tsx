'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
import { SidebarNav } from './sidebar-nav'
import { MobileDrawer } from './mobile-drawer'

interface NavItem {
  href: string
  label: string
  icon: ReactNode
}

interface Props {
  navItems: NavItem[]
  clinicName: string
  fullName: string
  roleLabel: string
  /** Foto profil untuk menggantikan logo di header sidebar. */
  avatarUrl?: string | null
  children: ReactNode
}

export function DashboardShell({ navItems, clinicName, fullName, roleLabel, avatarUrl, children }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Tutup drawer otomatis saat pindah halaman.
  useEffect(() => { setOpen(false) }, [pathname])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-5">
        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={fullName} className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-gray-100" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600">
              <span className="text-sm font-bold text-white">{fullName?.[0]?.toUpperCase() ?? 'K'}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{clinicName}</p>
            <p className="truncate text-xs text-gray-500">{fullName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <SidebarNav items={navItems} />
      </div>

      <div className="border-t border-gray-100 p-4">
        <div className="mb-1 flex items-center gap-3 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100">
            <span className="text-xs font-semibold text-teal-700">{fullName?.[0]?.toUpperCase()}</span>
          </div>
          <span className="truncate text-sm font-medium text-gray-700">{fullName}</span>
        </div>
        <form action="/auth/signout" method="post">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        {sidebar}
      </aside>

      {/* Top bar mobile/tablet */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Buka menu" className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={fullName} className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-gray-100" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600">
              <span className="text-xs font-bold text-white">{fullName?.[0]?.toUpperCase() ?? 'K'}</span>
            </div>
          )}
          <span className="text-sm font-semibold text-gray-900">{clinicName}</span>
        </div>
      </div>

      {/* Drawer mobile */}
      <MobileDrawer open={open} onClose={() => setOpen(false)} widthClass="w-72">
        <button
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </MobileDrawer>

      {/* Konten — animasi fade-in tiap pindah halaman (key=pathname). */}
      <div className="lg:ml-64">
        <main key={pathname} className="animate-page p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
