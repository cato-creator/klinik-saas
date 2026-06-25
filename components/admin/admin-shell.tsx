'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { MobileDrawer } from '@/components/ui/mobile-drawer'

interface AdminShellProps {
  clinicName: string
  sidebar: ReactNode
  children: ReactNode
}

export function AdminShell({ clinicName, sidebar, children }: AdminShellProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Tutup drawer setiap kali pindah halaman
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar — hanya tampil di mobile/tablet */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-100">
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">K</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm truncate">{clinicName}</span>
        </div>
      </header>

      {/* Sidebar desktop — fixed */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        {sidebar}
      </aside>

      {/* Drawer mobile — geser halus */}
      <MobileDrawer open={open} onClose={() => setOpen(false)} widthClass="w-64">
        <button
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
          className="absolute top-3 right-3 z-10 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </MobileDrawer>

      {/* Konten */}
      <div className="lg:ml-64">
        <main key={pathname} className="animate-page p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
