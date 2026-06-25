'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})
type FormData = z.infer<typeof schema>

// Dashboard tujuan per role. Admin TENANT memakai /klinik (bukan /admin yang
// dipakai panel super admin).
const ROLE_ROUTES: Record<string, string> = {
  patient: '/pasien/dashboard',
  therapist: '/terapis/dashboard',
  admin: '/klinik/dashboard',
  owner: '/owner/dashboard',
  super_admin: '/admin',
  affiliate: '/affiliate',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? ''

  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      const banned = /ban/i.test(authError.message) || (authError as { code?: string }).code === 'user_banned'
      setError(
        banned
          ? 'Akun Anda belum aktif. Klinik sedang menunggu konfirmasi dari admin.'
          : 'Email atau password salah. Silakan coba lagi.'
      )
      return
    }

    // Ambil role untuk redirect yang tepat.
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const role = profile?.role ?? 'patient'

    if (redirect && redirect.startsWith('/')) {
      router.push(redirect)
      router.refresh()
      return
    }

    router.push(ROLE_ROUTES[role] ?? '/pasien/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 mb-4">
          <span className="text-white text-2xl font-bold">K</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Portal Klinik</h1>
        <p className="text-sm text-gray-500 mt-1">Masuk ke akun Anda</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
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

          <div className="relative">
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              required
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-end">
            <Link href="/auth/lupa-password" className="text-sm text-teal-600 hover:text-teal-700 hover:underline">
              Lupa password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            <LogIn className="h-4 w-4" />
            Masuk
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md animate-pulse"><div className="h-96 bg-white rounded-2xl" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
