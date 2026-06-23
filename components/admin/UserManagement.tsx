'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Profile, UserRole } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface UserManagementProps {
  profiles: Profile[]
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Minimum 8 characters'),
  full_name: z.string().min(2),
  role: z.enum([
    'telesales_agent',
    'telesales_supervisor',
    'direct_sales_agent',
    'direct_sales_supervisor',
    'admin',
  ]),
})

type CreateUserFormData = z.infer<typeof createUserSchema>

const ROLE_LABELS: Record<UserRole, string> = {
  telesales_agent: 'Telesales Agent',
  telesales_supervisor: 'Telesales Supervisor',
  direct_sales_agent: 'Direct Sales Agent',
  direct_sales_supervisor: 'DS Supervisor',
  admin: 'Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  telesales_agent: '#3B82F6',
  telesales_supervisor: '#60A5FA',
  direct_sales_agent: '#14B8A6',
  direct_sales_supervisor: '#2DD4BF',
  admin: '#7C3AED',
}

export default function UserManagement({ profiles }: UserManagementProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'telesales_agent' },
  })

  async function onCreateUser(data: CreateUserFormData) {
    setCreating(true)
    try {
      // Use admin API via server action
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create user')
      } else {
        toast.success('User created successfully')
        reset()
        setShowCreate(false)
        router.refresh()
      }
    } catch {
      toast.error('Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(profileId: string, currentActive: boolean) {
    setTogglingId(profileId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentActive })
        .eq('id', profileId)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success(`User ${currentActive ? 'deactivated' : 'activated'}`)
        router.refresh()
      }
    } finally {
      setTogglingId(null)
    }
  }

  async function updateRole(profileId: string, newRole: UserRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Role updated')
      router.refresh()
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">User Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{profiles.length} users</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {/* Create User Form */}
      {showCreate && (
        <div className="bg-[#161616] border border-[#7C3AED]/30 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4">Create New User</h2>
          <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Full Name</label>
                <input
                  {...register('full_name')}
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
                {errors.full_name && (
                  <p className="text-[10px] text-[#F26161] mt-1">{errors.full_name.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="user@company.com"
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
                {errors.email && (
                  <p className="text-[10px] text-[#F26161] mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Password</label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Min. 8 characters"
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
                {errors.password && (
                  <p className="text-[10px] text-[#F26161] mt-1">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Role</label>
                <select
                  {...register('role')}
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {creating ? 'Creating…' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['User', 'Role', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b border-[#2a2a2a] last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: ROLE_COLORS[profile.role] + '30', color: ROLE_COLORS[profile.role] }}
                    >
                      {profile.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{profile.full_name}</p>
                      <p className="text-xs text-[#4B5563] font-mono">{profile.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={profile.role}
                    onChange={(e) => updateRole(profile.id, e.target.value as UserRole)}
                    className="bg-transparent text-xs rounded px-2 py-1 border border-[#2a2a2a] focus:outline-none"
                    style={{ color: ROLE_COLORS[profile.role] }}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value} style={{ color: '#fff', backgroundColor: '#1c1c22' }}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      color: profile.is_active ? '#22C55E' : '#6B7280',
                      backgroundColor: profile.is_active ? '#22C55E20' : '#6B728020',
                    }}
                  >
                    {profile.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(profile.id, profile.is_active)}
                    disabled={togglingId === profile.id}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                      profile.is_active
                        ? 'text-[#F26161] border border-[#F26161]/30 hover:bg-[#F26161]/10'
                        : 'text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/10'
                    }`}
                  >
                    {togglingId === profile.id
                      ? '…'
                      : profile.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
