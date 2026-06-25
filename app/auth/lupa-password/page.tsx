'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
})
type FormData = z.infer<typeof schema>

export default function LupaPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const supabase = createClient()

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (resetError) {
      setError('Gagal mengirim email reset. Silakan coba lagi.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
            <Mail className="h-8 w-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Email Terkirim</h2>
          <p className="text-sm text-gray-600 mb-6">
            Link reset password telah dikirim. Silakan cek inbox atau folder spam Anda.
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Halaman Masuk
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 mb-4">
          <span className="text-white text-2xl font-bold">K</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Lupa Password</h1>
        <p className="text-sm text-gray-500 mt-1">Portal Klinik</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <p className="text-sm text-gray-600 mb-5">
          Masukkan email yang terdaftar. Kami akan mengirimkan link untuk reset password Anda.
        </p>

        {error && (
          <Alert variant="error" className="mb-5">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="email@contoh.com"
            autoComplete="email"
            error={errors.email?.message}
            required
            {...register('email')}
          />

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            <Mail className="h-4 w-4" />
            Kirim Link Reset
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </div>
  )
}
