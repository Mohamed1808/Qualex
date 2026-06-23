'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import BrandLogo from '@/components/shared/BrandLogo'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // The recovery link establishes a session via detectSessionInUrl.
  useEffect(() => {
    const supabase = createClient()
    let resolved = false
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        resolved = true
        setReady(true)
      }
    })
    // Fallback: check for an existing session shortly after mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        resolved = true
        setReady(true)
      }
    })
    // If no recovery session arrives, the link is invalid/expired
    const timer = setTimeout(() => {
      if (!resolved) setInvalid(true)
    }, 3000)
    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) {
        if (error.message.toLowerCase().includes('session')) {
          setInvalid(true)
        }
        toast.error(error.message)
        return
      }
      toast.success('Password updated. Please sign in.')
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <BrandLogo variant="full" height={40} />
          </div>
          <p className="text-[#6B7280] text-sm">Qualex · Lead Management</p>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-8 shadow-2xl">
          {invalid ? (
            <div className="text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <h1 className="text-xl font-semibold text-white mb-1">Link expired</h1>
              <p className="text-[#6B7280] text-sm">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <a
                href="/forgot-password"
                className="inline-block mt-6 text-sm text-[#5757e6] hover:text-[#7d7dee] transition-colors"
              >
                Request a new link
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-white mb-1">Set a new password</h1>
              <p className="text-[#6B7280] text-sm mb-6">
                Choose a strong password you haven&apos;t used before.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#9CA3AF] mb-1.5">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register('password')}
                    className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#5757e6] focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={isLoading || !ready}
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-[#F26161]">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-[#9CA3AF] mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    {...register('confirm')}
                    className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#5757e6] focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={isLoading || !ready}
                  />
                  {errors.confirm && (
                    <p className="mt-1 text-xs text-[#F26161]">{errors.confirm.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !ready}
                  className="w-full bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors mt-2"
                >
                  {!ready ? 'Verifying link…' : isLoading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
