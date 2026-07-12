'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmUser } from '@/lib/crm/types'
import { listUsers, updateUser } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import PageHeader from './ui/PageHeader'
import { RolePill } from './ui/Pill'
import { Skeleton } from './ui/Skeleton'

export default function ProfileTab() {
  const { user } = useSession()
  const [me, setMe] = useState<CrmUser | null>(null)
  const [full_name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listUsers().then((us) => {
      const u = us.find((x) => x.id === user.id) ?? us[0]
      setMe(u); setName(u.full_name); setTitle(u.title ?? '')
    })
  }, [user.id])

  async function save() {
    if (!me) return
    setSaving(true)
    await updateUser(me.id, { full_name, title: title || null }, 'Profile updated')
    setSaving(false)
    toast.success('Profile saved')
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Profile" />

      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
        {!me ? (
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#5757e6]/20 flex items-center justify-center text-[#5757e6] text-2xl font-bold flex-shrink-0">
                {me.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[#111827] font-semibold truncate">{me.full_name}</p>
                <p className="text-sm text-[#6B7280] truncate">{me.email}</p>
                <div className="mt-1"><RolePill role={me.role} /></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Full name</label>
                <input value={full_name} onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
              </div>
              <div>
                <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
              </div>
              <div>
                <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Email</label>
                <input value={me.email} disabled
                  className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#6B7280] text-sm rounded-lg px-3 py-2" />
              </div>
              <button onClick={save} disabled={saving}
                className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
