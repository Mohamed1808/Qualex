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

interface TSSupervisorQueueProps {
  initialLeads: Lead[]
  agents: Pick<Profile, 'id' | 'full_name' | 'role' | 'is_active' | 'is_on_break'>[]
}

type TabType = 'all' | 'new' | 'assigned' | 'in_progress' | 'breached'

export default function TSSupervisorQueue({ initialLeads, agents }: TSSupervisorQueueProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TabType>('all')
  const [search, setSearch] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('')
  const [reassigning, setReassigning] = useState<string | null>(null)
  const [reassignAgentId, setReassignAgentId] = useState('')

  // Note: supervisor sees all stages — use a placeholder userId
  const { data: leads } = useLeadQueue({
    userId: 'supervisor',
    role: 'telesales_supervisor',
    initialData: initialLeads,
  })

  const filtered = (leads ?? []).filter((lead) => {
    if (tab === 'breached' && !lead.tele_sla_breached) return false
    if (tab === 'new' && lead.stage !== 'new') return false
    if (tab === 'assigned' && lead.stage !== 'telesales_assigned') return false
    if (tab === 'in_progress' && lead.stage !== 'telesales_in_progress') return false
    if (selectedChannel && lead.channel !== selectedChannel) return false
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
    const result = await assignLeadToAgent(leadId, reassignAgentId, 'telesales')
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Lead reassigned')
      setReassigning(null)
      setReassignAgentId('')
      router.refresh()
    }
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'breached', label: '🚨 Breached' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Telesales Live Queue</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{filtered.length} leads</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#2a2a2a]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-[#3B82F6] border-[#3B82F6]'
                : 'text-[#6B7280] border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
        />
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
        >
          <option value="">All Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="meta">Meta</option>
          <option value="website">Website</option>
          <option value="app">App</option>
          <option value="call_center">Call Center</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Name', 'Phone', 'Channel', 'Stage', 'Agent', 'SLA', 'Created', 'Actions'].map(
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate max-w-[150px]">
                          {lead.name}
                        </span>
                        {lead.is_duplicate && (
                          <span className="text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] px-1.5 py-0.5 rounded">
                            DUP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF] font-mono text-xs">{lead.phone}</td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={lead.channel} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#9CA3AF] bg-[#2a2a2a] px-2 py-1 rounded">
                        {getStageLabel(lead.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                      {lead.profiles_telesales?.full_name ?? (
                        <span className="text-[#F59E0B]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SLATimer dueAt={lead.tele_sla_due_at} breached={lead.tele_sla_breached} />
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs">
                      {format(parseISO(lead.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/telesales/agent/${lead.id}`)}
                          className="text-xs text-[#3B82F6] hover:underline"
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
                                  {a.is_on_break ? ' (break)' : ''}
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
                        ) : lead.assigned_telesales_agent ? (
                          <button
                            onClick={() => setReassigning(lead.id)}
                            className="text-xs text-[#6B7280] hover:text-white"
                          >
                            Reassign
                          </button>
                        ) : (
                          <button
                            onClick={() => setReassigning(lead.id)}
                            className="text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] px-2.5 py-1 rounded"
                          >
                            Assign →
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
