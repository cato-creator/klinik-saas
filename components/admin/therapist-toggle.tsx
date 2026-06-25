'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function TherapistToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [on, setOn] = useState(active)

  async function toggle() {
    setBusy(true)
    const next = !on
    try {
      const res = await fetch('/api/admin/terapis/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapist_id: id, is_active: next }),
      })
      if (res.ok) {
        setOn(next)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-teal-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}
