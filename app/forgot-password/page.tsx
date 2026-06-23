'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      setSent(true)
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
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Qualex</span>
          </div>
          <p className="text-[#6B7280] text-sm">Drive Finance Lead Management</p>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="text-3xl mb-3">📧</div>
              <h1 className="text-xl font-semibold text-white mb-1">Check your email</h1>
              <p className="text-[#6B7280] text-sm">
                If an account exists for{' '}
                <span className="text-[#9CA3AF]">{getValues('email')}</span>, we&apos;ve sent a link
                to reset your password. The link expires in 1 hour.
              </p>
              <a
                href="/login"
                className="inline-block mt-6 text-sm text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
              >
                ← Back to sign in
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-white mb-1">Reset your password</h1>
              <p className="text-[#6B7280] text-sm mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#9CA3AF] mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-[#F26161]">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors mt-2 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <a
                href="/login"
                className="block text-center mt-4 text-xs text-[#6B7280] hover:text-white transition-colors"
              >
                ← Back to sign in
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
