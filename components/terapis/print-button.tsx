'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Cetak Rekap' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  )
}
