'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { LeadStatus, StatusCategory, DepartmentScope } from '@/lib/crm/types'
import { listStatuses, createStatus, updateStatus, deleteStatus, listLeads } from '@/lib/crm/service'
import PageHeader from './ui/PageHeader'
import { CardSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

const PALETTE = ['#5757e6', '#3B82F6', '#14B8A6', '#22C55E', '#F59E0B', '#F26161', '#A855F7', '#EC4899', '#6B7280', '#25D366']

const SCOPE_ORDER: DepartmentScope[] = ['telesales', 'direct_sales', 'interconnected']
const SCOPE_LABELS: Record<DepartmentScope, string> = {
  telesales: 'Telesales',
  direct_sales: 'Direct Sales',
  interconnected: 'Interconnected',
}
const SCOPE_HINTS: Record<DepartmentScope, string> = {
  telesales: 'Used only inside the telesales flow. Fresh is the default when leads are imported.',
  direct_sales: 'Used only inside the direct sales flow.',
  interconnected: 'Shared handoff statuses (e.g. Qualified) — a lead carries these into both departments at once.',
}

export default function StatusManager() {
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [category, setCategory] = useState<StatusCategory>('open')
  const [scope, setScope] = useState<DepartmentScope>('telesales')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ status: LeadStatus; usageCount: number } | null>(null)

  async function reload() {
    const s = await listStatuses()
    setStatuses(s.sort((a, b) => a.sort_order - b.sort_order))
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const grouped = useMemo(() => {
    const g: Record<DepartmentScope, LeadStatus[]> = { telesales: [], direct_sales: [], interconnected: [] }
    for (const s of statuses) g[s.department_scope].push(s)
    return g
  }, [statuses])

  async function add() {
    if (!name.trim()) { toast.error('Enter a status name'); return }
    setSaving(true)
    await createStatus({
      name: name.trim(), color, category, department_scope: scope, is_default: false, is_active: true,
      sort_order: statuses.length + 1,
    })
    setSaving(false)
    setName('')
    toast.success(`Status added to ${SCOPE_LABELS[scope]}`)
    reload()
  }

  async function toggle(s: LeadStatus) {
    await updateStatus(s.id, { is_active: !s.is_active })
    reload()
  }

  async function changeScope(s: LeadStatus, department_scope: DepartmentScope) {
    await updateStatus(s.id, { department_scope })
    toast.success(`"${s.name}" moved to ${SCOPE_LABELS[department_scope]}`)
    reload()
  }

  async function requestRemove(s: LeadStatus) {
    const leads = await listLeads({ status_id: s.id })
    setConfirmDelete({ status: s, usageCount: leads.length })
  }

  async function confirmRemove() {
    if (!confirmDelete) return
    await deleteStatus(confirmDelete.status.id)
    toast.success('Status removed')
    setConfirmDelete(null)
    reload()
  }

  // Reorder within a section by swapping sort_order with the neighbour.
  async function move(list: LeadStatus[], index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const a = list[index], b = list[target]
    await Promise.all([updateStatus(a.id, { sort_order: b.sort_order }), updateStatus(b.id, { sort_order: a.sort_order })])
    reload()
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Lead Statuses"
        subtitle="Telesales and Direct Sales keep their own separate status lists; Interconnected statuses are the shared handoff that carries a lead into both departments." />

      {/* Add */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#111827] mb-3">Add new status</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Site Visit Booked"
              className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
          </div>
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Section</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as DepartmentScope)}
              className="mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none">
              {SCOPE_ORDER.map((sc) => <option key={sc} value={sc}>{SCOPE_LABELS[sc]}</option>)}
            </select>
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
                <button key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-[#111827] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button onClick={add} disabled={saving}
            className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Three sections */}
      {loading ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        SCOPE_ORDER.map((sc) => (
          <div key={sc} className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-semibold text-[#111827]">{SCOPE_LABELS[sc]} statuses</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">{SCOPE_HINTS[sc]}</p>
            </div>
            {grouped[sc].length === 0 ? (
              <EmptyState icon="🏷️" title="No statuses in this section" hint="Add one above." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                    <th className="px-4 py-2.5 w-16">Order</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Move to</th>
                    <th className="px-4 py-2.5">State</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[sc].map((s, i) => (
                    <tr key={s.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => move(grouped[sc], i, -1)} disabled={i === 0} title="Move up" className="text-[#6B7280] hover:text-[#111827] disabled:opacity-20 text-xs leading-none">▲</button>
                          <button onClick={() => move(grouped[sc], i, 1)} disabled={i === grouped[sc].length - 1} title="Move down" className="text-[#6B7280] hover:text-[#111827] disabled:opacity-20 text-xs leading-none">▼</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-[#111827]">{s.name}</span>
                          {s.is_default && <span className="text-[10px] text-[#5757e6] bg-[#5757e6]/15 px-1.5 py-0.5 rounded">default</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-[#4B5563] text-xs">{s.category}</td>
                      <td className="px-4 py-3">
                        <select value={s.department_scope} onChange={(e) => changeScope(s, e.target.value as DepartmentScope)}
                          className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1 focus:outline-none">
                          {SCOPE_ORDER.map((o) => <option key={o} value={o}>{SCOPE_LABELS[o]}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'text-[#22C55E] bg-[#22C55E]/15' : 'text-[#6B7280] bg-[#6B7280]/15'}`}>
                          {s.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                        <button onClick={() => toggle(s)} className="text-xs text-[#4B5563] hover:text-[#111827]">
                          {s.is_active ? 'Hide' : 'Show'}
                        </button>
                        {!s.is_default && (
                          <button onClick={() => requestRemove(s)} className="text-xs text-[#F26161] hover:underline">Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[#111827] mb-1">Delete &ldquo;{confirmDelete.status.name}&rdquo;?</h3>
            {confirmDelete.usageCount > 0 ? (
              <p className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 rounded-lg px-3 py-2 mb-4">
                ⚠ {confirmDelete.usageCount} lead{confirmDelete.usageCount === 1 ? '' : 's'} currently use this status. They will keep the label but it will no longer appear in this list.
              </p>
            ) : (
              <p className="text-xs text-[#6B7280] mb-4">This status isn&apos;t used by any leads yet.</p>
            )}
            <div className="flex gap-2">
              <button onClick={confirmRemove} className="flex-1 bg-[#F26161] hover:bg-[#DC2626] text-white text-sm font-medium rounded-lg py-2 transition-colors">Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="px-4 text-sm text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
