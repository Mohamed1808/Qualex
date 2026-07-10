'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmUser } from '@/lib/crm/types'
import { listUsers, updateUser } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'

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

  if (!me) return <div className="p-6 text-[#6B7280]">Loading…</div>

  async function save() {
    setSaving(true)
    await updateUser(me!.id, { full_name, title: title || null }, 'Profile updated')
    setSaving(false)
    toast.success('Profile saved')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-[#111827]">Profile</h1>

      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#5757e6]/20 flex items-center justify-center text-[#5757e6] text-2xl font-bold">
            {me.full_name.charAt(0)}
          </div>
          <div>
            <p className="text-[#111827] font-semibold">{me.full_name}</p>
            <p className="text-sm text-[#6B7280]">{me.email}</p>
            <span className="text-[10px] text-[#5757e6] bg-[#5757e6]/15 px-2 py-0.5 rounded-full capitalize">{me.role.replace(/_/g, ' ')}</span>
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
            className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
