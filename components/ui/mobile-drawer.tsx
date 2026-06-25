'use client'

import { useEffect, type ReactNode } from 'react'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  /** Arah masuk drawer. Default geser dari kiri. */
  side?: 'left' | 'right'
  /** Kelas lebar Tailwind panel, mis. "w-64" / "w-72". Default w-72. */
  widthClass?: string
  /** Breakpoint mulai drawer disembunyikan (di atasnya pakai sidebar fixed). Default lg. */
  hiddenFrom?: 'md' | 'lg'
  children: ReactNode
}

/**
 * Drawer mobile dengan animasi geser halus (selalu ter-mount agar bisa
 * beranimasi MASUK dan KELUAR), backdrop fade, kunci scroll body, tutup
 * dengan Escape, dan menghormati `prefers-reduced-motion`.
 *
 * Pengganti pola lama `{open && (...)}` yang muncul/hilang mendadak ("kaku").
 */
export function MobileDrawer({
  open,
  onClose,
  side = 'left',
  widthClass = 'w-72',
  hiddenFrom = 'lg',
  children,
}: MobileDrawerProps) {
  // Kunci scroll body selama drawer terbuka.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Tutup dengan tombol Escape.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const hideCls = hiddenFrom === 'md' ? 'md:hidden' : 'lg:hidden'
  const sideCls = side === 'left' ? 'left-0' : 'right-0'
  const closedTranslate = side === 'left' ? '-translate-x-full' : 'translate-x-full'

  // Easing mirip iOS sheet — terasa "premium" & smooth di HP.
  const ease = 'ease-[cubic-bezier(0.32,0.72,0,1)]'

  return (
    <div
      className={`fixed inset-0 z-50 ${hideCls} ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${ease} motion-reduce:transition-none ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* Panel */}
      <aside
        className={`absolute inset-y-0 ${sideCls} flex ${widthClass} max-w-[85%] flex-col bg-white shadow-2xl transition-transform duration-300 ${ease} will-change-transform motion-reduce:transition-none ${
          open ? 'translate-x-0' : closedTranslate
        }`}
      >
        {children}
      </aside>
    </div>
  )
}
