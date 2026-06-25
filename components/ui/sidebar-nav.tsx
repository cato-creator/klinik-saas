'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  // Elemen ikon yang sudah dirender (mis. <Calendar className="h-4 w-4" />).
  // JANGAN oper komponen ikon mentah dari Server Component — Next.js 16 melarang
  // mengoper fungsi/komponen sebagai prop ke Client Component.
  icon: ReactNode
}

interface SidebarNavProps {
  items: NavItem[]
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {items.map(({ href, label, icon }, i) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn(
              'animate-rise flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:translate-x-0.5',
              active
                ? 'bg-teal-50 text-teal-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <span className="flex-shrink-0">{icon}</span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
