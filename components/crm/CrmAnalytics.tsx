'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CrmLead, LeadStatus, CrmUser } from '@/lib/crm/types'
import { listLeads, listStatuses, listUsers } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import PageHeader from './ui/PageHeader'
import Funnel from './ui/Funnel'
import { CardSkeleton } from './ui/Skeleton'
import AgentLeadsDrawer from './AgentLeadsDrawer'

const QUALIFIED_PLUS = ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'approved']

export default function CrmAnalytics({ team }: { team: 'telesales' | 'direct_sales' }) {
  const { user } = useSession()
  const [allLeads, setAllLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [openAgent, setOpenAgent] = useState<CrmUser | null>(null)

  const teamKey = team === 'telesales' ? 'assigned_telesales_agent' : 'assigned_direct_sales_agent'
  const roleFilter = team === 'telesales' ? 'telesales_agent' : 'direct_sales_agent'

  async function loadAll() {
    const [l, s, u] = await Promise.all([listLeads(), listStatuses(), listUsers()])
    setAllLeads(l); setStatuses(s); setUsers(u); setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  const teamAgents = useMemo(() => users.filter((u) => u.role === roleFilter), [users, roleFilter])

  const leads = useMemo(() => {
    return allLeads.filter((l) => {
      if (from && l.created_at < from) return false
      if (to && l.created_at > `${to}T23:59:59`) return false
      if (agentFilter && l[teamKey] !== agentFilter) return false
      return true
    })
  }, [allLeads, from, to, agentFilter, teamKey])

  const kpis = useMemo(() => {
    const total = leads.length
    const qualified = leads.filter((l) => QUALIFIED_PLUS.includes(l.stage)).length
    const applied = leads.filter((l) => l.stage === 'approved').length
    const conversion = total ? Math.round((applied / total) * 100) : 0
    return { total, qualified, applied, conversion }
  }, [leads])

  const funnelSteps = useMemo(() => ([
    { label: 'Captured', value: leads.length },
    { label: 'Reached', value: leads.filter((l) => l.stage !== 'new').length },
    { label: 'Qualified', value: leads.filter((l) => QUALIFIED_PLUS.includes(l.stage)).length },
    { label: 'In Direct Sales', value: leads.filter((l) => ['ds_assigned', 'ds_in_progress', 'id_collected', 'approved'].includes(l.stage)).length },
    { label: 'Applied', value: leads.filter((l) => l.stage === 'approved').length },
  ]), [leads])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads) if (l.status_id) c[l.status_id] = (c[l.status_id] ?? 0) + 1
    return c
  }, [leads])

  // Leaderboard always over the full team (date-filtered), independent of agentFilter selection
  const dateLeads = useMemo(() => allLeads.filter((l) => (!from || l.created_at >= from) && (!to || l.created_at <= `${to}T23:59:59`)), [allLeads, from, to])
  const leaderboard = useMemo(() => teamAgents.map((a) => {
    const owned = dateLeads.filter((l) => l[teamKey] === a.id)
    const won = owned.filter((l) => l.stage === 'approved' || QUALIFIED_PLUS.includes(l.stage)).length
    return { agent: a, total: owned.length, won }
  }).sort((x, y) => y.won - x.won), [teamAgents, dateLeads, teamKey])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        crumbs={[{ label: 'CRM', href: '/crm' }]}
        title={`${team === 'telesales' ? 'Telesales' : 'Direct Sales'} Analytics`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]">
              <option value="">All agents</option>
              {teamAgents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
            <span className="text-xs text-[#6B7280]">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
            {(from || to || agentFilter) && <button onClick={() => { setFrom(''); setTo(''); setAgentFilter('') }} className="text-xs text-[#5757e6] hover:text-[#4444cc]">Reset</button>}
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1 bg-[#5757e6] rounded-xl p-5 flex flex-col justify-center">
              <p className="text-xs text-white/80 mb-1">Conversion Rate</p>
              <p className="text-4xl font-bold text-white">{kpis.conversion}%</p>
              <p className="text-[11px] text-white/70 mt-1">{agentFilter ? teamAgents.find((a) => a.id === agentFilter)?.full_name : 'all captured leads'} → applied</p>
            </div>
            <div className="sm:col-span-3 grid grid-cols-3 gap-4">
              {[['Total Leads', kpis.total, '#111827'], ['Qualified', kpis.qualified, '#14B8A6'], ['Applied', kpis.applied, '#22C55E']].map(([label, val, color]) => (
                <div key={label as string} className="bg-white border border-[#e5e7eb] rounded-xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-[#6B7280] mb-1">{label as string}</p>
                  <p className="text-2xl font-bold" style={{ color: color as string }}>{val as number}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">Conversion Funnel</h3>
              <Funnel steps={funnelSteps} />
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">Status Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${s.color}12` }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-[#374151]">{s.name}</span>
                    <span className="text-xs font-bold" style={{ color: s.color }}>{statusCounts[s.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent leaderboard — click a row to open that agent's leads */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <h3 className="text-sm font-semibold text-[#111827] px-5 pt-5 pb-1">Agent Leaderboard</h3>
            <p className="text-xs text-[#6B7280] px-5 pb-3">Click an agent to view all their leads and reassign at any stage.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                    <th className="px-5 py-2">Rank</th><th className="px-5 py-2">Agent</th><th className="px-5 py-2 text-right">Leads</th><th className="px-5 py-2 text-right">Won</th><th className="px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-[#4B5563] text-sm">No agents on this team yet.</td></tr>
                  ) : leaderboard.map((row, i) => (
                    <tr key={row.agent.id} onClick={() => setOpenAgent(row.agent)}
                      className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors cursor-pointer">
                      <td className="px-5 py-2.5 text-[#4B5563]">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                      <td className="px-5 py-2.5 text-[#111827] font-medium">{row.agent.full_name}</td>
                      <td className="px-5 py-2.5 text-right text-[#4B5563]">{row.total}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-[#22C55E]">{row.won}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-[#5757e6]">View →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {openAgent && (
        <AgentLeadsDrawer agent={openAgent} team={team} users={users} actorName={user.full_name} actorId={user.id}
          onClose={() => setOpenAgent(null)} onChanged={loadAll} />
      )}
    </div>
  )
}
