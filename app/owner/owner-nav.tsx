'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, UserPlus, ShieldCheck, TrendingUp, Globe, Link2,
  Wallet, BarChart3, Scale, KeyRound, HandCoins, Package,
  CalendarDays, Users, UserCog, Calendar, LogOut, Menu, X, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MobileDrawer } from '@/components/ui/mobile-drawer'

const ic = 17
const GROUPS = [
  {
    label: 'Utama',
    items: [{ href: '/owner/dashboard', label: 'Overview', Icon: LayoutDashboard }],
  },
  {
    label: 'Klinik',
    items: [
      { href: '/owner/staf/terapis', label: 'Tambah Terapis', Icon: UserPlus },
      { href: '/owner/staf/admin', label: 'Tambah Admin', Icon: ShieldCheck },
      { href: '/owner/terapis', label: 'Performa Terapis', Icon: TrendingUp },
      { href: '/owner/landing', label: 'Landing Page', Icon: Globe },
      { href: '/owner/domain', label: 'Domain Sendiri', Icon: Link2 },
      { href: '/owner/pengaturan', label: 'Pengaturan Booking', Icon: HandCoins },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { href: '/owner/keuangan', label: 'Arus Kas', Icon: Wallet },
      { href: '/owner/inventory', label: 'Barang Habis Pakai', Icon: Package },
      { href: '/owner/laba-rugi', label: 'Laba Rugi', Icon: Scale },
      { href: '/owner/laporan-tahunan', label: 'Laporan Tahunan', Icon: BarChart3 },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { href: '/klinik/dashboard', label: 'Dashboard Admin', Icon: LayoutDashboard },
      { href: '/klinik/booking', label: 'Semua Booking', Icon: CalendarDays },
      { href: '/klinik/pasien', label: 'Data Pasien', Icon: Users },
      { href: '/klinik/terapis', label: 'Manajemen Terapis', Icon: UserCog },
      { href: '/klinik/jadwal', label: 'Kalender Jadwal', Icon: Calendar },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/owner/akun', label: 'Ganti Password', Icon: KeyRound },
    ],
  },
]

export default function OwnerNav({ clinicName, fullName }: { clinicName: string; fullName: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Tutup drawer otomatis saat pindah halaman.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false) }, [pathname])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
        <span className="text-sm font-bold text-white">{clinicName?.[0]?.toUpperCase() ?? 'K'}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{clinicName}</p>
        <p className="text-xs text-teal-600 font-medium">Owner Panel</p>
      </div>
    </div>
  )

  const nav = (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{g.label}</p>
          <div className="space-y-0.5">
            {g.items.map(({ href, label, Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    active ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <Icon size={ic} className={cn('flex-shrink-0', active ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600')} />
                  {label}
                  {active && <ChevronRight size={13} className="ml-auto text-teal-500" />}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  const footer = (
    <div className="shrink-0 border-t border-gray-100 px-3 pb-4 pt-4">
      <div className="px-3 py-2 mb-1">
        <p className="truncate text-xs font-semibold text-gray-900">{fullName}</p>
        <p className="text-xs text-gray-400">Owner</p>
      </div>
      <form action="/auth/signout" method="post">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50">
          <LogOut size={18} className="flex-shrink-0" /> Keluar
        </button>
      </form>
    </div>
  )

  return (
    <>
      {/* Sidebar desktop — fixed tinggi penuh, menu scroll, footer menempel bawah */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        <div className="shrink-0 border-b border-gray-100 px-5 py-5">{brand}</div>
        {nav}
        {footer}
      </aside>

      {/* Top bar mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
        <button onClick={() => setOpen(true)} aria-label="Buka menu" className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100">
          <Menu size={20} />
        </button>
        {brand}
      </header>

      {/* Drawer mobile — geser halus */}
      <MobileDrawer open={open} onClose={() => setOpen(false)} widthClass="w-72">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          {brand}
          <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        </div>
        {nav}
        {footer}
      </MobileDrawer>
    </>
  )
}
