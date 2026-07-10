'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import BrandLogo from '@/components/shared/BrandLogo'
import { login, roleHome } from '@/lib/crm/session'
import { SEED_USERS } from '@/lib/crm/mock-data'

export default function CrmLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const user = login(email)
    if (!user) {
      setLoading(false)
      toast.error('No account found for that email')
      return
    }
    toast.success(`Welcome, ${user.full_name}`)
    router.replace(roleHome(user.role))
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><BrandLogo variant="full" height={40} /></div>
          <p className="text-[#6B7280] text-sm">Drive Finance CRM · Lead Management</p>
        </div>

        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-[#111827] mb-1">Sign in</h1>
          <p className="text-[#6B7280] text-sm mb-6">Enter your work email to access your portal.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] rounded-lg px-3 py-2.5 text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#5757e6]"
                placeholder="you@drivefinance.eg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4B5563] mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] rounded-lg px-3 py-2.5 text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#5757e6]"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo helper — no real auth yet */}
          <div className="mt-6 pt-5 border-t border-[#e5e7eb]">
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wide mb-2">Demo accounts (any password)</p>
            <div className="space-y-1">
              {SEED_USERS.map((u) => (
                <button key={u.id} onClick={() => setEmail(u.email)}
                  className="w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg bg-[#f3f4f6] hover:bg-[#eef0f2] transition-colors">
                  <span className="text-[#111827]">{u.full_name}</span>
                  <span className="text-[#6B7280] capitalize">{u.role.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-[#4B5563] text-xs mt-6">Frontend demo · backend to be connected by the team.</p>
      </div>
    </div>
  )
}
