import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Accent = 'teal' | 'sky' | 'violet' | 'amber' | 'emerald' | 'rose' | 'green' | 'blue'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  /**
   * Bila diisi, ikon tampil dalam tile gradien berwarna + aksen halus di kartu
   * (tampilan modern/berwarna). Bila kosong, perilaku lama dipertahankan
   * (tile abu-abu) agar dashboard role lain tidak berubah.
   */
  accent?: Accent
  trend?: { value: number; label: string }
  className?: string
}

const ACCENT: Record<Accent, { tile: string; ring: string }> = {
  teal:    { tile: 'bg-gradient-to-br from-teal-500 to-emerald-500',    ring: 'ring-teal-100' },
  sky:     { tile: 'bg-gradient-to-br from-sky-500 to-cyan-500',        ring: 'ring-sky-100' },
  violet:  { tile: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',  ring: 'ring-violet-100' },
  amber:   { tile: 'bg-gradient-to-br from-amber-400 to-orange-500',    ring: 'ring-amber-100' },
  emerald: { tile: 'bg-gradient-to-br from-emerald-500 to-green-500',   ring: 'ring-emerald-100' },
  rose:    { tile: 'bg-gradient-to-br from-rose-500 to-pink-500',       ring: 'ring-rose-100' },
  green:   { tile: 'bg-gradient-to-br from-green-500 to-emerald-500',   ring: 'ring-green-100' },
  blue:    { tile: 'bg-gradient-to-br from-blue-500 to-sky-500',        ring: 'ring-blue-100' },
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor = 'text-teal-600', accent, trend, className }: StatCardProps) {
  const a = accent ? ACCENT[accent] : null

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all sm:p-6',
        a && 'hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          a ? (
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-4', a.tile, a.ring)}>
              <Icon className="h-5 w-5" />
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 p-3">
              <Icon className={cn('h-6 w-6', iconColor)} />
            </div>
          )
        )}
      </div>
    </div>
  )
}
