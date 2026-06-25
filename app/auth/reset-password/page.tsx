'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

const schema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Password tidak cocok',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (updateError) {
      setError('Gagal memperbarui password. Silakan minta link reset baru.')
      return
    }

    router.push('/auth/login?message=password_updated')
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 mb-3">
            <Lock className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Buat Password Baru</h1>
        </div>

        {error && <Alert variant="error" className="mb-5">{error}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="relative">
            <Input
              label="Password Baru"
              type={showPass ? 'text' : 'password'}
              placeholder="Minimal 8 karakter"
              error={errors.password?.message}
              required
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-gray-400">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Input
            label="Konfirmasi Password"
            type="password"
            placeholder="Ulangi password baru"
            error={errors.confirm_password?.message}
            required
            {...register('confirm_password')}
          />

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Simpan Password Baru
          </Button>
        </form>
      </div>
    </div>
  )
}
