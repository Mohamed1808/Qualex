'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead, Profile } from '@/types/database'
import { useLeadQueue } from '@/hooks/useLeadQueue'
import ChannelBadge from '@/components/shared/ChannelBadge'
import SLATimer from '@/components/shared/SLATimer'
import { getStageLabel } from '@/lib/assignment'
import { assignLeadToAgent } from '@/actions/assignment'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface DSSupervisorQueueProps {
  initialLeads: Lead[]
  agents: Pick<Profile, 'id' | 'full_name' | 'role' | 'is_active' | 'is_on_break'>[]
}

export default function DSSupervisorQueue({ initialLeads, agents }: DSSupervisorQueueProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [reassigning, setReassigning] = useState<string | null>(null)
  const [reassignAgentId, setReassignAgentId] = useState('')

  const { data: leads } = useLeadQueue({
    userId: 'supervisor',
    role: 'direct_sales_supervisor',
    initialData: initialLeads,
  })

  const filtered = (leads ?? []).filter((lead) => {
    if (stageFilter && lead.stage !== stageFilter) return false
    if (
      search &&
      !lead.name.toLowerCase().includes(search.toLowerCase()) &&
      !lead.phone.includes(search)
    )
      return false
    return true
  })

  async function handleReassign(leadId: string) {
    if (!reassignAgentId) {
      toast.error('Select an agent first')
      return
    }
    const result = await assignLeadToAgent(leadId, reassignAgentId, 'direct_sales')
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Lead reassigned')
      setReassigning(null)
      setReassignAgentId('')
      router.refresh()
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Direct Sales Live Queue</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{filtered.length} leads</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
        >
          <option value="">All Stages</option>
          <option value="ds_assigned">DS Assigned</option>
          <option value="ds_in_progress">DS In Progress</option>
          <option value="id_collected">ID Collected</option>
          <option value="credit_submitted">Credit Submitted</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Name', 'Phone', 'Channel', 'Stage', 'DS Agent', 'SLA', 'Qualified At', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#4B5563] text-sm">
                    No leads found
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1c1c22] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-[#9CA3AF] font-mono text-xs">{lead.phone}</td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={lead.channel} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          color: '#14B8A6',
                          backgroundColor: '#14B8A615',
                        }}
                      >
                        {getStageLabel(lead.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                      {lead.profiles_direct_sales?.full_name ?? (
                        <span className="text-[#F59E0B]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SLATimer dueAt={lead.ds_sla_due_at} breached={lead.ds_sla_breached} />
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs">
                      {lead.telesales_qualified_at
                        ? format(parseISO(lead.telesales_qualified_at), 'MMM d, HH:mm')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/direct-sales/agent/${lead.id}`)}
                          className="text-xs text-[#14B8A6] hover:underline"
                        >
                          View
                        </button>
                        {reassigning === lead.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={reassignAgentId}
                              onChange={(e) => setReassignAgentId(e.target.value)}
                              className="bg-[#0f0f0f] border border-[#2a2a2a] text-white text-xs rounded px-2 py-1"
                            >
                              <option value="">Agent…</option>
                              {agents.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.full_name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleReassign(lead.id)}
                              className="text-xs text-[#22C55E] hover:underline"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => setReassigning(null)}
                              className="text-xs text-[#6B7280] hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReassigning(lead.id)}
                            className="text-xs text-[#6B7280] hover:text-white"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
