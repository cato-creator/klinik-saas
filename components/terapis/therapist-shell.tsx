'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, Stethoscope } from 'lucide-react'
import { MobileDrawer } from '@/components/ui/mobile-drawer'
import { cn } from '@/lib/utils'

export type Accent = 'teal' | 'sky' | 'violet' | 'amber' | 'rose'

export interface ShellNavItem {
  href: string
  label: string
  icon: ReactNode
  accent: Accent
  /** Path lain yang juga menandai menu ini aktif (mis. halaman catatan sesi). */
  matchPrefixes?: string[]
}

/**
 * Skema warna per item menu. Disengaja beragam (multi-warna) tapi lembut —
 * tiap menu punya identitas warna sendiri, aktif = tile gradien + pill bertint.
 * Class ditulis literal agar tidak ke-purge Tailwind.
 */
const ACCENT: Record<Accent, { pill: string; bar: string; tileActive: string; tileIdle: string; text: string }> = {
  teal: {
    pill: 'bg-teal-50 text-teal-700',
    bar: 'bg-teal-500',
    tileActive: 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-sm shadow-teal-500/30',
    tileIdle: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
    text: 'text-teal-700',
  },
  sky: {
    pill: 'bg-sky-50 text-sky-700',
    bar: 'bg-sky-500',
    tileActive: 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/30',
    tileIdle: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100',
    text: 'text-sky-700',
  },
  violet: {
    pill: 'bg-violet-50 text-violet-700',
    bar: 'bg-violet-500',
    tileActive: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/30',
    tileIdle: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
    text: 'text-violet-700',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-700',
    bar: 'bg-amber-500',
    tileActive: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30',
    tileIdle: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    text: 'text-amber-700',
  },
  rose: {
    pill: 'bg-rose-50 text-rose-700',
    bar: 'bg-rose-500',
    tileActive: 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-500/30',
    tileIdle: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
    text: 'text-rose-700',
  },
}

interface Props {
  navItems: ShellNavItem[]
  clinicName: string
  fullName: string
  avatarUrl?: string | null
  children: ReactNode
}

export function TherapistShell({ navItems, clinicName, fullName, avatarUrl, children }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  const initial = fullName?.[0]?.toUpperCase() ?? 'T'

  const nav = (
    <nav className="space-y-1.5">
      {navItems.map(({ href, label, icon, accent, matchPrefixes }, i) => {
        const isMatch = (p: string) => pathname === p || pathname.startsWith(p + '/')
        const active = isMatch(href) || (matchPrefixes ?? []).some(isMatch)
        const a = ACCENT[accent]
        return (
          <Link
            key={href}
            href={href}
            style={{ animationDelay: `${i * 55}ms` }}
            className={cn(
              'group animate-rise relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              active ? a.pill : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {active && <span className={cn('absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full', a.bar)} />}
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                active ? a.tileActive : a.tileIdle
              )}
            >
              {icon}
            </span>
            <span className={cn('truncate', active && a.text)}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const brand = (
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-500 p-5 text-white">
      <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      <div className="relative flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={fullName} className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-2 ring-white/40" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/30 backdrop-blur-sm">
            <span className="text-base font-bold">{initial}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{clinicName}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm">
            <Stethoscope className="h-3 w-3" /> Terapis
          </p>
        </div>
      </div>
    </div>
  )

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      {brand}
      <div className="flex-1 overflow-y-auto px-3 py-4">{nav}</div>
      <div className="border-t border-gray-100 p-3">
        <div className="mb-1 flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-bold text-white">
            {initial}
          </div>
          <span className="truncate text-sm font-medium text-gray-700">{fullName}</span>
        </div>
        <form action="/auth/signout" method="post">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-100 bg-white shadow-sm lg:flex">
        {sidebar}
      </aside>

      {/* Top bar mobile/tablet */}
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-3 text-white shadow-sm lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Buka menu" className="rounded-lg p-1.5 transition-colors hover:bg-white/15">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={fullName} className="h-8 w-8 shrink-0 rounded-lg object-cover ring-2 ring-white/40" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
              <span className="text-xs font-bold">{initial}</span>
            </div>
          )}
          <span className="text-sm font-bold">{clinicName}</span>
        </div>
      </div>

      {/* Drawer mobile */}
      <MobileDrawer open={open} onClose={() => setOpen(false)} widthClass="w-72">
        <button
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </MobileDrawer>

      {/* Konten */}
      <div className="lg:ml-64">
        <main key={pathname} className="animate-page mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
