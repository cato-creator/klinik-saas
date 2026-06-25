'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

// Kartu "Ganti Password" yang dipakai di semua dashboard (kecuali super admin).
// Memakai sesi login yang aktif — Supabase memverifikasi identitas dari sesi,
// jadi cukup masukkan password baru + konfirmasi.
export function ChangePasswordCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)

    if (password.length < 8) {
      setError('Password baru minimal 8 karakter.')
      return
    }
    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError('Gagal memperbarui password. Coba lagi.')
      return
    }

    setPassword('')
    setConfirm('')
    setOk(true)
  }

  return (
    <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100">
          <KeyRound className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Ganti Password</h2>
          <p className="text-xs text-gray-500">Perbarui password login akun Anda.</p>
        </div>
      </div>

      {ok && <Alert variant="success" className="mb-4">Password berhasil diperbarui.</Alert>}
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="relative">
          <Input
            label="Password Baru"
            type={show ? 'text' : 'password'}
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-8 text-gray-400"
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Input
          label="Konfirmasi Password Baru"
          type={show ? 'text' : 'password'}
          placeholder="Ulangi password baru"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" size="lg" loading={saving}>
          Simpan Password Baru
        </Button>
      </form>
    </div>
  )
}
