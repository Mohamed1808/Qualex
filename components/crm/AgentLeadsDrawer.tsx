'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, CrmUser } from '@/lib/crm/types'
import { listLeads, reassignWithComment } from '@/lib/crm/service'
import { StagePill } from './ui/Pill'
import { Skeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

export default function AgentLeadsDrawer({
  agent, team, users, actorName, onClose, onChanged,
}: {
  agent: CrmUser
  team: 'telesales' | 'direct_sales'
  users: CrmUser[]
  actorName: string
  onClose: () => void
  onChanged: () => void
}) {
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [loading, setLoading] = useState(true)
  const [reassignFor, setReassignFor] = useState<CrmLead | null>(null)
  const [toUser, setToUser] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  async function reload() {
    const all = await listLeads()
    const key = team === 'telesales' ? 'assigned_telesales_agent' : 'assigned_direct_sales_agent'
    setLeads(all.filter((l) => l[key] === agent.id))
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [agent.id])

  const allAgents = users.filter((u) => u.role.includes('agent') && u.is_active)
  const filtered = statusFilter ? leads.filter((l) => l.stage === statusFilter) : leads
  const stages = Array.from(new Set(leads.map((l) => l.stage)))

  async function submitReassign() {
    if (!reassignFor || !toUser) { toast.error('Pick an agent'); return }
    if (!comment.trim()) { toast.error('Add a comment explaining the reassignment'); return }
    setSaving(true)
    const res = await reassignWithComment(reassignFor.id, toUser, comment.trim(), actorName)
    setSaving(false)
    if (!res.ok) { toast.error(res.error ?? 'Failed'); return }
    toast.success('Lead reassigned')
    setReassignFor(null); setToUser(''); setComment('')
    reload(); onChanged()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white border-l border-[#e5e7eb] w-full max-w-xl h-full flex flex-col shadow-2xl animate-[slideIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-start justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">{agent.full_name}</h3>
            <p className="text-xs text-[#6B7280]">{leads.length} leads · {agent.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#6B7280] hover:text-[#111827] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] transition-colors">✕</button>
        </div>

        {stages.length > 0 && (
          <div className="px-5 py-3 border-b border-[#e5e7eb] flex-shrink-0">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1.5 focus:outline-none">
              <option value="">All stages ({leads.length})</option>
              {stages.map((st) => <option key={st} value={st}>{st.replace(/_/g, ' ')} ({leads.filter((l) => l.stage === st).length})</option>)}
            </select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-2">
          {loading ? (
            <><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></>
          ) : filtered.length === 0 ? (
            <EmptyState icon="🗂️" title="No leads for this agent" />
          ) : filtered.map((l) => (
            <div key={l.id} className="border border-[#e5e7eb] rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-[#111827] font-medium truncate">{l.name} <span className="text-[#6B7280] font-mono text-xs">{l.phone}</span></p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StagePill stage={l.stage} />
                    {l.campaign && <span className="text-[10px] text-[#6B7280]">{l.campaign}</span>}
                  </div>
                  {l.unqualification_reason && <p className="text-[11px] text-[#F26161] mt-1">⚠ {l.unqualification_reason}</p>}
                </div>
                <button onClick={() => { setReassignFor(l); setToUser(''); setComment('') }}
                  className="text-xs font-medium text-[#5757e6] hover:text-[#4444cc] flex-shrink-0">Reassign</button>
              </div>

              {reassignFor?.id === l.id && (
                <div className="mt-3 pt-3 border-t border-[#e5e7eb] space-y-2">
                  <select value={toUser} onChange={(e) => setToUser(e.target.value)}
                    className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none">
                    <option value="">Reassign to…</option>
                    {allAgents.map((a) => <option key={a.id} value={a.id}>{a.full_name}{a.id === agent.id ? ' (same agent)' : ''} — {a.role.replace(/_/g, ' ')}</option>)}
                  </select>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                    placeholder="Reason / problem to re-tackle (e.g. recall the client, high-interest lead worth re-qualifying)…"
                    className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
                  <div className="flex gap-2">
                    <button onClick={submitReassign} disabled={saving} className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                      {saving ? 'Reassigning…' : 'Reassign with comment'}
                    </button>
                    <button onClick={() => setReassignFor(null)} className="px-3 text-sm text-[#6B7280] hover:text-[#111827]">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
