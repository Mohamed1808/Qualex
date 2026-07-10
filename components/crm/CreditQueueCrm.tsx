'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead } from '@/lib/crm/types'
import { listLeads, recordCreditDecision } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'

export default function CreditQueueCrm() {
  const { user } = useSession()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [note, setNote] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  async function reload() {
    const all = await listLeads()
    setLeads(all.filter((l) => l.stage === 'credit_submitted'))
  }
  useEffect(() => { reload() }, [])

  async function decide(lead: CrmLead, decision: 'approved' | 'rejected') {
    if (decision === 'rejected' && !note.trim()) { toast.error('Add a rejection reason'); return }
    await recordCreditDecision(lead.id, decision, note.trim(), user.full_name)
    toast.success(`Lead ${decision}`)
    setActing(null); setNote('')
    reload()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Credit Decisions</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{leads.length} awaiting a decision</p>
      </div>
      {leads.length === 0 ? (
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl py-16 text-center text-[#4B5563] text-sm">Nothing awaiting credit.</div>
      ) : leads.map((l) => (
        <div key={l.id} className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#111827] font-medium">{l.name} <span className="text-[#6B7280] font-mono text-xs">{l.phone}</span></p>
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
                className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
              <div className="flex gap-2 mt-3">
                <button onClick={() => decide(l, 'approved')} className="bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-medium rounded-lg px-4 py-2">✓ Approve</button>
                <button onClick={() => decide(l, 'rejected')} className="bg-[#F26161] hover:bg-[#DC2626] text-white text-sm font-medium rounded-lg px-4 py-2">✕ Reject</button>
                <button onClick={() => { setActing(null); setNote('') }} className="text-[#6B7280] text-sm px-3">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setActing(l.id)} className="mt-4 bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2">Make decision</button>
          )}
        </div>
      ))}
    </div>
  )
}
