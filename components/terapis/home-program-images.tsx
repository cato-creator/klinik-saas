'use client'

// Galeri gambar Home Program (read-only) + lightbox klik-untuk-perbesar.
// Dipakai saat menjelaskan latihan ke pasien di layar.

import { useState } from 'react'
import { X } from 'lucide-react'

export function HomeProgramImages({ images }: { images: string[] }) {
  const [zoom, setZoom] = useState<string | null>(null)
  if (!images || images.length === 0) return null

  return (
    <>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setZoom(url)}
            className="aspect-square overflow-hidden rounded-lg border border-gray-200 transition-transform hover:scale-[1.02]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Latihan" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          <button
            type="button"
            aria-label="Tutup"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setZoom(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Latihan" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
