'use client'

// ============================================================
// PETA TUBUH BISA DIKLIK — tandai bagian yang sakit (tampak DEPAN & BELAKANG).
// Silhouette dibuat dari bentuk dasar SVG (bukan foto) supaya titik klik presisi,
// ringan, & tajam di HP. Tiap bagian = satu zona yang bisa di-tap (toggle).
// Hasil disimpan sebagai array { id, label } ke AnamnesisData.pain_regions.
// ============================================================

import { X } from 'lucide-react'

export interface PainRegion {
  id: string
  label: string
}

type Shape =
  | { el: 'circle'; cx: number; cy: number; r: number }
  | { el: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { el: 'ellipse'; cx: number; cy: number; rx: number; ry: number }

interface Zone extends PainRegion {
  shape: Shape
}

// Tampak DEPAN — sisi KIRI layar = sisi KANAN pasien.
const FRONT: Zone[] = [
  { id: 'kepala', label: 'Kepala', shape: { el: 'circle', cx: 110, cy: 34, r: 24 } },
  { id: 'leher', label: 'Leher', shape: { el: 'rect', x: 99, y: 56, w: 22, h: 16, rx: 6 } },
  { id: 'bahu_kanan', label: 'Bahu kanan', shape: { el: 'circle', cx: 70, cy: 84, r: 14 } },
  { id: 'bahu_kiri', label: 'Bahu kiri', shape: { el: 'circle', cx: 150, cy: 84, r: 14 } },
  { id: 'dada', label: 'Dada', shape: { el: 'rect', x: 82, y: 80, w: 56, h: 44, rx: 12 } },
  { id: 'lengan_atas_kanan', label: 'Lengan atas kanan', shape: { el: 'rect', x: 52, y: 92, w: 18, h: 58, rx: 9 } },
  { id: 'lengan_atas_kiri', label: 'Lengan atas kiri', shape: { el: 'rect', x: 150, y: 92, w: 18, h: 58, rx: 9 } },
  { id: 'siku_kanan', label: 'Siku kanan', shape: { el: 'circle', cx: 61, cy: 154, r: 9 } },
  { id: 'siku_kiri', label: 'Siku kiri', shape: { el: 'circle', cx: 159, cy: 154, r: 9 } },
  { id: 'lengan_bawah_kanan', label: 'Lengan bawah kanan', shape: { el: 'rect', x: 52, y: 162, w: 16, h: 56, rx: 8 } },
  { id: 'lengan_bawah_kiri', label: 'Lengan bawah kiri', shape: { el: 'rect', x: 152, y: 162, w: 16, h: 56, rx: 8 } },
  { id: 'tangan_kanan', label: 'Tangan kanan', shape: { el: 'circle', cx: 60, cy: 228, r: 11 } },
  { id: 'tangan_kiri', label: 'Tangan kiri', shape: { el: 'circle', cx: 160, cy: 228, r: 11 } },
  { id: 'perut', label: 'Perut', shape: { el: 'rect', x: 84, y: 126, w: 52, h: 52, rx: 12 } },
  { id: 'panggul', label: 'Panggul / Pinggul', shape: { el: 'rect', x: 82, y: 180, w: 56, h: 28, rx: 12 } },
  { id: 'paha_kanan', label: 'Paha kanan', shape: { el: 'rect', x: 84, y: 210, w: 24, h: 80, rx: 12 } },
  { id: 'paha_kiri', label: 'Paha kiri', shape: { el: 'rect', x: 112, y: 210, w: 24, h: 80, rx: 12 } },
  { id: 'lutut_kanan', label: 'Lutut kanan', shape: { el: 'circle', cx: 96, cy: 298, r: 12 } },
  { id: 'lutut_kiri', label: 'Lutut kiri', shape: { el: 'circle', cx: 124, cy: 298, r: 12 } },
  { id: 'tungkai_kanan', label: 'Tungkai bawah kanan', shape: { el: 'rect', x: 86, y: 312, w: 20, h: 82, rx: 10 } },
  { id: 'tungkai_kiri', label: 'Tungkai bawah kiri', shape: { el: 'rect', x: 114, y: 312, w: 20, h: 82, rx: 10 } },
  { id: 'kaki_kanan', label: 'Kaki / pergelangan kanan', shape: { el: 'ellipse', cx: 96, cy: 406, rx: 12, ry: 8 } },
  { id: 'kaki_kiri', label: 'Kaki / pergelangan kiri', shape: { el: 'ellipse', cx: 124, cy: 406, rx: 12, ry: 8 } },
]

// Tampak BELAKANG — sisi KIRI layar = sisi KIRI pasien.
const BACK: Zone[] = [
  { id: 'kepala_blk', label: 'Kepala belakang', shape: { el: 'circle', cx: 110, cy: 34, r: 24 } },
  { id: 'tengkuk', label: 'Tengkuk', shape: { el: 'rect', x: 99, y: 56, w: 22, h: 16, rx: 6 } },
  { id: 'bahu_blk_kiri', label: 'Bahu belakang kiri', shape: { el: 'circle', cx: 70, cy: 84, r: 14 } },
  { id: 'bahu_blk_kanan', label: 'Bahu belakang kanan', shape: { el: 'circle', cx: 150, cy: 84, r: 14 } },
  { id: 'punggung_atas', label: 'Punggung atas', shape: { el: 'rect', x: 82, y: 80, w: 56, h: 44, rx: 12 } },
  { id: 'lengan_blk_kiri', label: 'Lengan belakang kiri', shape: { el: 'rect', x: 52, y: 92, w: 18, h: 58, rx: 9 } },
  { id: 'lengan_blk_kanan', label: 'Lengan belakang kanan', shape: { el: 'rect', x: 150, y: 92, w: 18, h: 58, rx: 9 } },
  { id: 'lengan_bawah_blk_kiri', label: 'Lengan bawah belakang kiri', shape: { el: 'rect', x: 52, y: 162, w: 16, h: 56, rx: 8 } },
  { id: 'lengan_bawah_blk_kanan', label: 'Lengan bawah belakang kanan', shape: { el: 'rect', x: 152, y: 162, w: 16, h: 56, rx: 8 } },
  { id: 'tangan_blk_kiri', label: 'Tangan belakang kiri', shape: { el: 'circle', cx: 60, cy: 228, r: 11 } },
  { id: 'tangan_blk_kanan', label: 'Tangan belakang kanan', shape: { el: 'circle', cx: 160, cy: 228, r: 11 } },
  { id: 'punggung_bawah', label: 'Punggung bawah / Pinggang', shape: { el: 'rect', x: 84, y: 126, w: 52, h: 52, rx: 12 } },
  { id: 'bokong', label: 'Bokong', shape: { el: 'rect', x: 82, y: 180, w: 56, h: 28, rx: 12 } },
  { id: 'paha_blk_kiri', label: 'Paha belakang kiri (hamstring)', shape: { el: 'rect', x: 84, y: 210, w: 24, h: 80, rx: 12 } },
  { id: 'paha_blk_kanan', label: 'Paha belakang kanan (hamstring)', shape: { el: 'rect', x: 112, y: 210, w: 24, h: 80, rx: 12 } },
  { id: 'lipat_lutut_kiri', label: 'Lipat lutut kiri', shape: { el: 'circle', cx: 96, cy: 298, r: 12 } },
  { id: 'lipat_lutut_kanan', label: 'Lipat lutut kanan', shape: { el: 'circle', cx: 124, cy: 298, r: 12 } },
  { id: 'betis_kiri', label: 'Betis kiri', shape: { el: 'rect', x: 86, y: 312, w: 20, h: 82, rx: 10 } },
  { id: 'betis_kanan', label: 'Betis kanan', shape: { el: 'rect', x: 114, y: 312, w: 20, h: 82, rx: 10 } },
  { id: 'tumit_kiri', label: 'Tumit / Achilles kiri', shape: { el: 'ellipse', cx: 96, cy: 406, rx: 12, ry: 8 } },
  { id: 'tumit_kanan', label: 'Tumit / Achilles kanan', shape: { el: 'ellipse', cx: 124, cy: 406, rx: 12, ry: 8 } },
]

function ZoneShape({ zone, on, onToggle }: { zone: Zone; on: boolean; onToggle: () => void }) {
  const fill = on ? '#0d9488' : '#cbd5e1'
  const common = {
    fill,
    stroke: '#ffffff',
    strokeWidth: 2,
    className: 'cursor-pointer transition-colors',
    style: { transition: 'fill .15s' } as React.CSSProperties,
    onClick: onToggle,
  }
  const s = zone.shape
  return (
    <g>
      <title>{zone.label}</title>
      {s.el === 'circle' && <circle cx={s.cx} cy={s.cy} r={s.r} {...common} />}
      {s.el === 'ellipse' && <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />}
      {s.el === 'rect' && <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0} {...common} />}
    </g>
  )
}

function BodySvg({ title, zones, selected, onToggle }: {
  title: string; zones: Zone[]; selected: Set<string>; onToggle: (z: Zone) => void
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-xs font-bold text-gray-500">{title}</p>
      <svg viewBox="0 0 220 430" className="h-auto w-full max-w-[180px]" role="img" aria-label={`Peta tubuh ${title}`}>
        {zones.map((z) => (
          <ZoneShape key={z.id} zone={z} on={selected.has(z.id)} onToggle={() => onToggle(z)} />
        ))}
      </svg>
    </div>
  )
}

export function BodyMap({ value, onChange }: { value: PainRegion[]; onChange: (v: PainRegion[]) => void }) {
  const selected = new Set(value.map((v) => v.id))

  function toggle(z: Zone) {
    if (selected.has(z.id)) onChange(value.filter((v) => v.id !== z.id))
    else onChange([...value, { id: z.id, label: z.label }])
  }
  function removeId(id: string) {
    onChange(value.filter((v) => v.id !== id))
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
      <p className="mb-1 text-sm font-bold text-gray-800">Lokasi Keluhan / Nyeri</p>
      <p className="mb-3 text-xs text-gray-400">Tap bagian tubuh yang sakit. Bisa pilih lebih dari satu.</p>

      <div className="grid grid-cols-2 gap-2">
        <BodySvg title="Tampak Depan" zones={FRONT} selected={selected} onToggle={toggle} />
        <BodySvg title="Tampak Belakang" zones={BACK} selected={selected} onToggle={toggle} />
      </div>

      {value.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {value.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
              {r.label}
              <button type="button" onClick={() => removeId(r.id)} aria-label={`Hapus ${r.label}`} className="text-teal-600 hover:text-teal-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-gray-400">Belum ada bagian tubuh dipilih.</p>
      )}
    </div>
  )
}
