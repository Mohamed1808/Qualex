'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { CrmLead, CrmUser, LeadStage, LeadChannel } from '@/lib/crm/types'
import {
  listLeads, listUsers, listProjects, assignTelesales, assignDirectSales,
  autoAssignBalanced, bulkAssign,
} from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import LeadWorkDrawer from './LeadWorkDrawer'
import LeadHistoryDrawer from './LeadHistoryDrawer'
import PageHeader from './ui/PageHeader'
import { StagePill, stageColor, stageLabel, Pill } from './ui/Pill'
import { TableSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'
import { DensityToggle, useDensity } from './ui/useDensity'
import { CHANNELS, CHANNEL_LABELS, CHANNEL_COLORS } from '@/lib/crm/constants'
import type { Project } from '@/lib/crm/types'

// Each supervisor only sees the stages that belong to their own flow. "unqualified"
// appears in both, because a lead unqualified by either side is relevant to both.
const STAGES: Record<'telesales' | 'direct_sales', LeadStage[]> = {
  telesales: ['new', 'telesales_assigned', 'telesales_in_progress', 'unqualified', 'unreachable', 'retired', 'terminated'],
  direct_sales: ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'approved', 'unqualified'],
}

export default function SupervisorQueue({ team }: { team: 'telesales' | 'direct_sales' }) {
  const { user } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const CURRENT = { id: user.id, name: user.full_name, role: user.role }
  const { density, setDensity, rowPad } = useDensity()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('')
  const [channelFilter, setChannelFilter] = useState<LeadChannel | ''>('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState<'' | 'unassigned' | 'assigned'>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAgent, setBulkAgent] = useState('')
  const [workFor, setWorkFor] = useState<CrmLead | null>(null)
  const [historyFor, setHistoryFor] = useState<CrmLead | null>(null)

  async function reload() {
    const [l, u, p] = await Promise.all([listLeads(), listUsers(), listProjects()])
    setLeads(l.filter((x) => STAGES[team].includes(x.stage)))
    setUsers(u); setProjects(p)
    setLoading(false)
    setSelected(new Set())
  }
  useEffect(() => { setLoading(true); reload() /* eslint-disable-next-line */ }, [team])

  // Deep-link from a notification: ?lead=<id> auto-opens the work drawer, then clears the param.
  useEffect(() => {
    const leadId = searchParams.get('lead')
    if (!leadId || leads.length === 0) return
    const match = leads.find((l) => l.id === leadId)
    if (match) setWorkFor(match)
    router.replace(team === 'telesales' ? '/crm/telesales/queue' : '/crm/direct-sales/queue')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, leads])

  const agents = users.filter((u) => u.role === (team === 'telesales' ? 'telesales_agent' : 'direct_sales_agent') && u.is_active)
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? '—'
  const campaigns = useMemo(() => Array.from(new Set(leads.map((l) => l.campaign).filter(Boolean))) as string[], [leads])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads) c[l.stage] = (c[l.stage] ?? 0) + 1
    return c
  }, [leads])

  const teamAgentId = (l: CrmLead) => team === 'telesales' ? l.assigned_telesales_agent : l.assigned_direct_sales_agent
  const filtered = leads.filter((l) =>
    (!stageFilter || l.stage === stageFilter) &&
    (!channelFilter || l.channel === channelFilter) &&
    (!campaignFilter || l.campaign === campaignFilter) &&
    (!assignmentFilter || (assignmentFilter === 'unassigned' ? !teamAgentId(l) : !!teamAgentId(l))) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search) || l.entry_id.toLowerCase().includes(search.toLowerCase()))
  )
  const hasFilters = !!(stageFilter || channelFilter || campaignFilter || assignmentFilter || search)

  async function assign(lead: CrmLead, agentId: string) {
    if (!agentId) return
    if (team === 'telesales') await assignTelesales(lead.id, agentId, CURRENT.name)
    else await assignDirectSales(lead.id, agentId, CURRENT.name)
    toast.success('Lead assigned')
    reload()
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    setSelected((s) => s.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id)))
  }

  async function runBulkAssign() {
    if (!bulkAgent || selected.size === 0) { toast.error('Select leads and an agent'); return }
    const n = await bulkAssign(Array.from(selected), bulkAgent, CURRENT.name)
    toast.success(`Assigned ${n} lead(s)`)
    setBulkAgent('')
    reload()
  }

  async function runAutoAssign() {
    const res = await autoAssignBalanced(CURRENT.name, team)
    const headLabel = team === 'telesales' ? 'new' : 'qualified'
    if (res.assigned > 0) toast.success(`Auto-assigned ${res.assigned} lead(s) across checked-in agents${res.skipped ? ` — ${res.reason}` : ''}`)
    else if (res.reason) toast.error(res.reason) // e.g. no agents checked in, or everyone at the cap
    else toast.info(`No unassigned "${headLabel}" leads to distribute`)
    reload()
  }

  const label = team === 'telesales' ? 'Telesales' : 'Direct Sales'
  const allSelected = filtered.length > 0 && selected.size === filtered.length

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        crumbs={[{ label: 'CRM', href: '/crm' }]}
        title={`${label} Live Queue`}
        subtitle={`${filtered.length} of ${leads.length} leads`}
        action={
          <button onClick={runAutoAssign} title={`Randomly distributes ${team === 'telesales' ? 'new' : 'qualified'} leads to checked-in agents holding fewer than 20 active leads`}
            className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            ⚡ Auto-assign {team === 'telesales' ? 'new' : 'qualified'} leads
          </button>
        }
      />

      {/* stage counts */}
      <div className="flex flex-wrap gap-2">
        {STAGES[team].map((st) => (
          <button key={st} onClick={() => setStageFilter((s) => s === st ? '' : st)}
            className={`text-xs px-3 py-2 rounded-lg border capitalize transition-colors ${
              stageFilter === st ? 'ring-1' : 'border-[#e5e7eb] text-[#4B5563] hover:border-[#d1d5db]'
            }`}
            style={stageFilter === st ? { borderColor: stageColor(st), color: stageColor(st), backgroundColor: `${stageColor(st)}10` } : undefined}>
            {stageLabel(st)} <span className="font-bold text-[#111827]">{counts[st] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entry ID, name or phone…"
          className="flex-1 min-w-[180px] bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as LeadChannel | '')} className={selCls}>
          <option value="">All channels</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
        </select>
        <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className={selCls}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value as typeof assignmentFilter)} className={selCls}>
          <option value="">All leads</option>
          <option value="unassigned">Unassigned only</option>
          <option value="assigned">Assigned only</option>
        </select>
        {hasFilters && <button onClick={() => { setStageFilter(''); setChannelFilter(''); setCampaignFilter(''); setAssignmentFilter(''); setSearch('') }} className="text-xs text-[#5757e6] hover:text-[#4444cc]">Reset</button>}
        <DensityToggle density={density} onChange={setDensity} />
      </div>

      {/* bulk assign bar */}
      {selected.size > 0 && (
        <div className="bg-[#5757e6]/8 border border-[#5757e6]/30 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[#4444cc] font-medium">{selected.size} selected</span>
          <span className="text-xs text-[#6B7280]">→ assign to</span>
          <select value={bulkAgent} onChange={(e) => setBulkAgent(e.target.value)} className={selCls}>
            <option value="">Select agent…</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
          <button onClick={runBulkAssign} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors">Assign selected</button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-[#6B7280] hover:text-[#111827]">Clear</button>
        </div>
      )}

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-3 py-3 w-8"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-[#5757e6]" /></th>
                <th className="px-4 py-3">Entry ID</th>
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Source</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Stage</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Assign</th><th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} cols={11} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11}>
                  <EmptyState icon="📋" title="No leads in this queue"
                    hint={hasFilters ? 'Try different filters.' : `Leads will appear here as they enter ${label.toLowerCase()}.`} />
                </td></tr>
              ) : filtered.map((l) => {
                const agentId = team === 'telesales' ? l.assigned_telesales_agent : l.assigned_direct_sales_agent
                const agent = users.find((u) => u.id === agentId)
                return (
                  <tr key={l.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors"
                    style={{ boxShadow: `inset 3px 0 0 ${stageColor(l.stage)}` }}>
                    <td className={`px-3 ${rowPad}`}><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} className="accent-[#5757e6]" /></td>
                    <td className={`px-4 ${rowPad} text-xs font-mono text-[#6B7280]`}>{l.entry_id}</td>
                    <td className={`px-4 ${rowPad} text-[#111827]`}>{l.name}</td>
                    <td className={`px-4 ${rowPad} text-[#4B5563] font-mono text-xs`}>{l.phone}</td>
                    <td className={`px-4 ${rowPad}`}><Pill label={CHANNEL_LABELS[l.channel]} color={CHANNEL_COLORS[l.channel]} /></td>
                    <td className={`px-4 ${rowPad} text-xs text-[#4B5563]`}>{projectName(l.project_id)}</td>
                    <td className={`px-4 ${rowPad} text-xs text-[#4B5563]`}>{l.campaign ?? '—'}</td>
                    <td className={`px-4 ${rowPad}`}><StagePill stage={l.stage} /></td>
                    <td className={`px-4 ${rowPad} text-xs text-[#4B5563]`}>{agent?.full_name ?? <span className="text-[#F59E0B]">Unassigned</span>}</td>
                    <td className={`px-4 ${rowPad}`}>
                      <select value="" onChange={(e) => assign(l, e.target.value)} className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1 focus:outline-none">
                        <option value="">{agent ? 'Reassign…' : 'Assign…'}</option>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                      </select>
                    </td>
                    <td className={`px-4 ${rowPad} whitespace-nowrap`}>
                      {team === 'direct_sales' && (
                        <button onClick={() => setWorkFor(l)} className="text-xs text-[#5757e6] hover:underline mr-2">Open</button>
                      )}
                      <button onClick={() => setHistoryFor(l)} className="text-xs text-[#6B7280] hover:text-[#111827]">History</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {workFor && <LeadWorkDrawer lead={workFor} currentUser={CURRENT} onChanged={reload} onClose={() => setWorkFor(null)} />}
      {historyFor && <LeadHistoryDrawer lead={historyFor} currentUser={CURRENT} onClose={() => setHistoryFor(null)} />}
    </div>
  )
}

const selCls = 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
