'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead } from '@/lib/crm/types'
import { listLeads, recordCreditDecision } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import PageHeader from './ui/PageHeader'
import { CardSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

function agingLabel(iso: string | null): { text: string; urgent: boolean } {
  if (!iso) return { text: '—', urgent: false }
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000)
  if (hours < 1) return { text: 'Just now', urgent: false }
  if (hours < 24) return { text: `${hours}h ago`, urgent: hours >= 12 }
  return { text: `${Math.floor(hours / 24)}d ago`, urgent: true }
}

export default function CreditQueueCrm() {
  const { user } = useSession()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  async function reload() {
    const all = await listLeads()
    setLeads(all.filter((l) => l.stage === 'credit_submitted'))
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  async function decide(lead: CrmLead, decision: 'approved' | 'rejected') {
    setTouched(true)
    if (decision === 'rejected' && !note.trim()) { toast.error('Add a rejection reason'); return }
    await recordCreditDecision(lead.id, decision, note.trim(), user.full_name)
    toast.success(`Lead ${decision}`)
    setActing(null); setNote(''); setTouched(false)
    reload()
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Credit Decisions" subtitle={`${leads.length} awaiting a decision`} />

      {loading ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl">
          <EmptyState icon="🏦" title="Nothing awaiting credit" hint="Leads with submitted documents will appear here for review." />
        </div>
      ) : leads.map((l) => {
        const aging = agingLabel(l.direct_sales_assigned_at)
        const rejectError = touched && acting === l.id && !note.trim()
        return (
          <div key={l.id} className="bg-white border border-[#e5e7eb] rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <p className="text-[#111827] font-medium">{l.name} <span className="text-[#6B7280] font-mono text-xs">{l.phone}</span></p>
                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${aging.urgent ? 'text-[#F26161] bg-[#F26161]/10' : 'text-[#6B7280] bg-[#f3f4f6]'}`}>
                  Submitted {aging.text}
                </span>
              </div>
              {l.id_document_url && <a href={l.id_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#5757e6] hover:underline">📎 ID document</a>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {[['Salary', l.salary_bracket], ['Down payment', l.down_payment_bracket], ['Program', l.financing_program], ['Occupation', l.occupation], ['National ID', l.customer_national_id], ['Car', l.requested_car_brand]].map(([k, v]) => (
                <div key={k} className="bg-[#f3f4f6] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[#6B7280] uppercase">{k}</p>
                  <p className="text-xs text-[#111827] capitalize">{v || '—'}</p>
                </div>
              ))}
            </div>
            {acting === l.id ? (
              <div className="mt-4 border-t border-[#e5e7eb] pt-4">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Decision note (required for rejection)…"
                  className={`w-full bg-[#f3f4f6] border text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${rejectError ? 'border-[#F26161] focus:ring-[#F26161]' : 'border-[#e5e7eb] focus:ring-[#5757e6]'}`} />
                {rejectError && <p className="text-[11px] text-[#F26161] mt-1">A rejection reason is required.</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => decide(l, 'approved')} className="bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">✓ Approve</button>
                  <button onClick={() => decide(l, 'rejected')} className="bg-[#F26161] hover:bg-[#DC2626] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">✕ Reject</button>
                  <button onClick={() => { setActing(null); setNote(''); setTouched(false) }} className="text-[#6B7280] text-sm px-3 hover:text-[#111827]">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setActing(l.id)} className="mt-4 bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Make decision</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
