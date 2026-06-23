'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/types/database'
import ChannelBadge from '@/components/shared/ChannelBadge'
import { recordCreditDecision } from '@/actions/credit'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface CreditQueueProps {
  initialLeads: Lead[]
}

export default function CreditQueue({ initialLeads }: CreditQueueProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)

  const filtered = leads.filter(
    (l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
  )

  async function decide(leadId: string, decision: 'approved' | 'rejected') {
    if (decision === 'rejected' && !note.trim()) {
      toast.error('Add a rejection reason')
      return
    }
    setPending(true)
    const result = await recordCreditDecision(leadId, decision, note.trim())
    setPending(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Lead ${decision}`)
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    setActing(null)
    setNote('')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Credit Decisions</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {filtered.length} lead{filtered.length === 1 ? '' : 's'} awaiting a credit decision
        </p>
      </div>

      <input
        type="text"
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
      />

      {filtered.length === 0 ? (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl py-16 text-center text-[#4B5563] text-sm">
          No leads awaiting a credit decision.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <div
              key={lead.id}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{lead.name}</span>
                    <ChannelBadge channel={lead.channel} />
                  </div>
                  <p className="text-xs text-[#9CA3AF] font-mono">{lead.phone}</p>
                </div>
                <button
                  onClick={() => router.push(`/direct-sales/agent/${lead.id}`)}
                  className="text-xs text-[#7C3AED] hover:underline flex-shrink-0"
                >
                  View full file →
                </button>
              </div>

              {/* Financial snapshot */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Salary', value: lead.salary_bracket },
                  { label: 'Down Payment', value: lead.down_payment_bracket },
                  { label: 'Program', value: lead.financing_program?.replace('_', ' ') },
                  { label: 'Occupation', value: lead.occupation },
                  { label: 'Car', value: lead.requested_car_brand },
                  { label: 'Year', value: lead.requested_car_year?.toString() },
                  { label: 'National ID', value: lead.customer_national_id },
                  {
                    label: 'Submitted',
                    value: lead.direct_sales_assigned_at
                      ? format(parseISO(lead.direct_sales_assigned_at), 'MMM d, HH:mm')
                      : null,
                  },
                ].map((f) => (
                  <div key={f.label} className="bg-[#1c1c22] rounded-lg px-3 py-2">
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-wide">{f.label}</p>
                    <p className="text-xs text-white mt-0.5 truncate capitalize">{f.value || '—'}</p>
                  </div>
                ))}
              </div>

              {lead.ds_notes && (
                <p className="text-xs text-[#9CA3AF] mt-3">
                  <span className="text-[#6B7280]">DS notes:</span> {lead.ds_notes}
                </p>
              )}
              {lead.id_document_url && (
                <a
                  href={lead.id_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-[#3B82F6] hover:underline mt-2"
                >
                  📎 View ID document
                </a>
              )}

              {/* Actions */}
              {acting === lead.id ? (
                <div className="mt-4 border-t border-[#2a2a2a] pt-4">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Decision note (required for rejection)…"
                    rows={2}
                    className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => decide(lead.id, 'approved')}
                      disabled={pending}
                      className="bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => decide(lead.id, 'rejected')}
                      disabled={pending}
                      className="bg-[#F26161] hover:bg-[#DC2626] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                    >
                      ✕ Reject
                    </button>
                    <button
                      onClick={() => {
                        setActing(null)
                        setNote('')
                      }}
                      className="text-[#6B7280] hover:text-white text-sm px-3 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setActing(lead.id)
                      setNote('')
                    }}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                  >
                    Make decision
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
