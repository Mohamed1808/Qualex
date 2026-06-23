'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

const ROLE_HOME: Record<string, string> = {
  telesales_agent: '/telesales/agent',
  telesales_supervisor: '/telesales/supervisor',
  direct_sales_agent: '/direct-sales/agent',
  direct_sales_supervisor: '/direct-sales/supervisor',
  admin: '/admin',
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    const supabase = createClient()
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (!authData.user) {
        toast.error('Login failed. Please try again.')
        return
      }

      // Fetch profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        toast.error('Could not load your profile. Please contact admin.')
        return
      }

      const destination = ROLE_HOME[profile.role] ?? '/login'
      toast.success('Welcome back!')
      router.push(destination)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Qualex</span>
          </div>
          <p className="text-[#6B7280] text-sm">Drive Finance Lead Management</p>
        </div>

        {/* Card */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-1">Sign in to your account</h1>
          <p className="text-[#6B7280] text-sm mb-6">Enter your credentials to access the portal</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#9CA3AF] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-[#F26161]">{errors.password.message}</p>
              )}
              <div className="mt-1.5 text-right">
                <a
                  href="/forgot-password"
                  className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#1d4ed8] disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[#4B5563] text-xs mt-6">
          Qualex v1.0 — Drive Finance © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
