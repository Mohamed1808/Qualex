'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { LeadStatus, StatusCategory } from '@/lib/crm/types'
import { listStatuses, createStatus, updateStatus, deleteStatus } from '@/lib/crm/service'

const PALETTE = ['#5757e6', '#3B82F6', '#14B8A6', '#22C55E', '#F59E0B', '#F26161', '#A855F7', '#EC4899', '#6B7280', '#25D366']

export default function StatusManager() {
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [category, setCategory] = useState<StatusCategory>('open')
  const [saving, setSaving] = useState(false)

  async function reload() { setStatuses(await listStatuses()) }
  useEffect(() => { reload() }, [])

  async function add() {
    if (!name.trim()) { toast.error('Enter a status name'); return }
    setSaving(true)
    await createStatus({
      name: name.trim(), color, category, is_default: false, is_active: true,
      sort_order: statuses.length + 1,
    })
    setSaving(false)
    setName('')
    toast.success('Status added — now available in the sales portal')
    reload()
  }

  async function toggle(s: LeadStatus) {
    await updateStatus(s.id, { is_active: !s.is_active })
    reload()
  }
  async function remove(s: LeadStatus) {
    await deleteStatus(s.id)
    toast.success('Status removed')
    reload()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Lead Statuses</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Add or manage statuses. Changes reflect instantly in the sales portal.</p>
      </div>

      {/* Add */}
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#111827] mb-3">Add new status</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Site Visit Booked"
              className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
          </div>
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as StatusCategory)}
              className="mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none">
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide block mb-1">Color</label>
            <div className="flex gap-1.5">
              {PALETTE.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-[#111827]' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button onClick={add} disabled={saving}
            className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.id} className="border-b border-[#e5e7eb] last:border-0">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[#111827]">{s.name}</span>
                    {s.is_default && <span className="text-[10px] text-[#5757e6] bg-[#5757e6]/15 px-1.5 py-0.5 rounded">default</span>}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-[#4B5563] text-xs">{s.category}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'text-[#22C55E] bg-[#22C55E]/15' : 'text-[#6B7280] bg-[#6B7280]/15'}`}>
                    {s.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => toggle(s)} className="text-xs text-[#4B5563] hover:text-[#111827]">
                    {s.is_active ? 'Hide' : 'Show'}
                  </button>
                  {!s.is_default && (
                    <button onClick={() => remove(s)} className="text-xs text-[#F26161] hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
