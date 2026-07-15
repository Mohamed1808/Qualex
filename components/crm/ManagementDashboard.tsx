'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CrmLead, LeadStatus, CrmUser } from '@/lib/crm/types'
import { listLeads, listStatuses, listUsers } from '@/lib/crm/service'
import PageHeader from './ui/PageHeader'
import { CardSkeleton } from './ui/Skeleton'
import StatusDistTable from './ui/StatusDistTable'

type Dept = 'all' | 'telesales' | 'direct_sales'

const DS_TERMINAL = ['approved', 'rejected'] // final direct-sales outcomes
const QUALIFIED_STAGES = ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'approved', 'rejected']

function fmtDur(ms: number | null): string {
  if (ms == null || !isFinite(ms) || ms < 0) return '—'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}
function avg(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}
function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

export default function ManagementDashboard() {
  const [allLeads, setAllLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dept, setDept] = useState<Dept>('all')
  const [agentFilter, setAgentFilter] = useState('')

  useEffect(() => {
    Promise.all([listLeads(), listStatuses(), listUsers()]).then(([l, s, u]) => { setAllLeads(l); setStatuses(s); setUsers(u); setLoading(false) })
  }, [])

  const tsAgents = useMemo(() => users.filter((u) => u.role === 'telesales_agent'), [users])
  const dsAgents = useMemo(() => users.filter((u) => u.role === 'direct_sales_agent'), [users])
  const agentOptions = dept === 'telesales' ? tsAgents : dept === 'direct_sales' ? dsAgents : [...tsAgents, ...dsAgents]
  const userName = (id: string | null) => users.find((u) => u.id === id)?.full_name ?? '—'

  const leads = useMemo(() => {
    const toEnd = to ? `${to}T23:59:59` : ''
    return allLeads.filter((l) => {
      if (from && l.created_at < from) return false
      if (toEnd && l.created_at > toEnd) return false
      if (dept === 'direct_sales' && !l.telesales_qualified_at) return false // only leads that reached DS
      if (agentFilter && l.assigned_telesales_agent !== agentFilter && l.assigned_direct_sales_agent !== agentFilter) return false
      return true
    })
  }, [allLeads, from, to, dept, agentFilter])

  // ---- KPIs -------------------------------------------------------------
  const kpis = useMemo(() => {
    const total = leads.length
    const qualified = leads.filter((l) => l.telesales_qualified_at).length
    const applied = leads.filter((l) => l.stage === 'approved').length
    const qualTimes = leads.filter((l) => l.telesales_qualified_at).map((l) => new Date(l.telesales_qualified_at!).getTime() - new Date(l.created_at).getTime())
    const dsHandleTimes = leads
      .filter((l) => l.telesales_qualified_at && DS_TERMINAL.includes(l.stage))
      .map((l) => new Date(l.updated_at).getTime() - new Date(l.telesales_qualified_at!).getTime())
    return {
      total, qualified, applied,
      qualificationRate: total ? Math.round((qualified / total) * 100) : 0,
      conversionRate: total ? Math.round((applied / total) * 100) : 0,
      avgQualMs: avg(qualTimes),
      avgDsHandleMs: avg(dsHandleTimes),
    }
  }, [leads])

  // ---- Leads in vs handled per day (last 14 days present) ---------------
  const perDay = useMemo(() => {
    const inByDay: Record<string, number> = {}
    const handledByDay: Record<string, number> = {}
    for (const l of leads) {
      inByDay[dayKey(l.created_at)] = (inByDay[dayKey(l.created_at)] ?? 0) + 1
      // "handled" = the lead has been worked past its initial assigned state
      if (!['new', 'telesales_assigned'].includes(l.stage)) {
        handledByDay[dayKey(l.updated_at)] = (handledByDay[dayKey(l.updated_at)] ?? 0) + 1
      }
    }
    const days = Array.from(new Set([...Object.keys(inByDay), ...Object.keys(handledByDay)])).sort().reverse().slice(0, 14)
    const maxVal = Math.max(1, ...days.map((d) => Math.max(inByDay[d] ?? 0, handledByDay[d] ?? 0)))
    return { rows: days.map((d) => ({ day: d, in: inByDay[d] ?? 0, handled: handledByDay[d] ?? 0 })), maxVal }
  }, [leads])

  // ---- Avg qualification time per telesales agent -----------------------
  const perAgentQual = useMemo(() => {
    return tsAgents.map((a) => {
      const owned = leads.filter((l) => l.assigned_telesales_agent === a.id && l.telesales_qualified_at)
      const times = owned.map((l) => new Date(l.telesales_qualified_at!).getTime() - new Date(l.created_at).getTime())
      return { agent: a, qualified: owned.length, avgMs: avg(times) }
    }).filter((r) => r.qualified > 0).sort((x, y) => (x.avgMs ?? Infinity) - (y.avgMs ?? Infinity))
  }, [tsAgents, leads])

  // ---- Agent performance (telesales + direct sales) ---------------------
  const agentPerf = useMemo(() => {
    const ts = tsAgents.map((a) => {
      const owned = leads.filter((l) => l.assigned_telesales_agent === a.id)
      const qualified = owned.filter((l) => l.telesales_qualified_at).length
      return { agent: a, dept: 'Telesales', leads: owned.length, outcome: qualified, outcomeLabel: 'Qualified', rate: owned.length ? Math.round((qualified / owned.length) * 100) : 0 }
    })
    const ds = dsAgents.map((a) => {
      const owned = leads.filter((l) => l.assigned_direct_sales_agent === a.id)
      const applied = owned.filter((l) => l.stage === 'approved').length
      return { agent: a, dept: 'Direct Sales', leads: owned.length, outcome: applied, outcomeLabel: 'Applied', rate: owned.length ? Math.round((applied / owned.length) * 100) : 0 }
    })
    return [...ts, ...ds].filter((r) => r.leads > 0)
  }, [tsAgents, dsAgents, leads])

  // ---- Status distribution (per department, own status) -----------------
  const tsStatuses = useMemo(() => statuses.filter((s) => s.department_scope === 'telesales' || s.department_scope === 'interconnected'), [statuses])
  const dsStatuses = useMemo(() => statuses.filter((s) => s.department_scope === 'direct_sales' || s.department_scope === 'interconnected'), [statuses])
  const tsCounts = useMemo(() => countBy(leads, (l) => l.telesales_status_id), [leads])
  const dsCounts = useMemo(() => countBy(leads, (l) => l.direct_sales_status_id), [leads])

  // ---- Top reasons for unqualified / not interested ---------------------
  const reasons = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads) {
      const r = (l.unqualification_reason ?? '').trim()
      if (r) c[r] = (c[r] ?? 0) + 1
    }
    const notInterested = leads.filter((l) => {
      const t = statuses.find((s) => s.id === l.telesales_status_id)?.name
      const d = statuses.find((s) => s.id === l.direct_sales_status_id)?.name
      return t === 'Not interested' || d === 'Not interested'
    }).length
    return { rows: Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8), notInterested }
  }, [leads, statuses])

  const hasFilters = !!(from || to || dept !== 'all' || agentFilter)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        crumbs={[{ label: 'CRM', href: '/crm' }]}
        title="Management Dashboard"
        subtitle="Company-wide performance across telesales and direct sales."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={dept} onChange={(e) => { setDept(e.target.value as Dept); setAgentFilter('') }} className={sel}>
              <option value="all">All departments</option>
              <option value="telesales">Telesales</option>
              <option value="direct_sales">Direct Sales</option>
            </select>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className={sel}>
              <option value="">All agents</option>
              {agentOptions.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={sel} />
            <span className="text-xs text-[#6B7280]">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={sel} />
            {hasFilters && <button onClick={() => { setFrom(''); setTo(''); setDept('all'); setAgentFilter('') }} className="text-xs text-[#5757e6] hover:text-[#4444cc]">Reset</button>}
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Total Leads" value={String(kpis.total)} color="#111827" />
            <Kpi label="Qualified" value={String(kpis.qualified)} color="#10B981" />
            <Kpi label="Qualification Rate" value={`${kpis.qualificationRate}%`} color="#5757e6" hint="of leads in" />
            <Kpi label="Conversion Rate" value={`${kpis.conversionRate}%`} color="#059669" hint="applied / leads in" />
            <Kpi label="Avg Qualify Time" value={fmtDur(kpis.avgQualMs)} color="#0EA5E9" hint="entry → qualified" />
            <Kpi label="Avg DS Handling" value={fmtDur(kpis.avgDsHandleMs)} color="#8B5CF6" hint="qualified → resolved" />
          </div>

          {/* Leads in vs handled per day */}
          <Card title="Leads In vs Handled — per day">
            {perDay.rows.length === 0 ? <Empty /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 px-3 text-right w-20">Leads In</th>
                    <th className="py-2 px-3 text-right w-24">Handled</th>
                    <th className="py-2 pl-3">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {perDay.rows.map((r) => (
                    <tr key={r.day} className="border-b border-[#f3f4f6] last:border-0">
                      <td className="py-1.5 pr-3 text-xs text-[#374151] whitespace-nowrap">{r.day}</td>
                      <td className="py-1.5 px-3 text-right text-xs font-semibold text-[#5757e6]">{r.in}</td>
                      <td className="py-1.5 px-3 text-right text-xs font-semibold text-[#22C55E]">{r.handled}</td>
                      <td className="py-1.5 pl-3">
                        <div className="space-y-1">
                          <Bar value={r.in} max={perDay.maxVal} color="#5757e6" />
                          <Bar value={r.handled} max={perDay.maxVal} color="#22C55E" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex gap-4 mt-3 text-[10px] text-[#6B7280]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#5757e6]" /> Leads in</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#22C55E]" /> Handled</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Avg qualification time per agent */}
            <Card title="Avg Qualification Time — per agent">
              {perAgentQual.length === 0 ? <Empty /> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                      <th className="py-2 pr-3">Agent</th>
                      <th className="py-2 px-3 text-right">Qualified</th>
                      <th className="py-2 pl-3 text-right">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perAgentQual.map((r) => (
                      <tr key={r.agent.id} className="border-b border-[#f3f4f6] last:border-0">
                        <td className="py-1.5 pr-3 text-xs text-[#111827]">{r.agent.full_name}</td>
                        <td className="py-1.5 px-3 text-right text-xs text-[#4B5563]">{r.qualified}</td>
                        <td className="py-1.5 pl-3 text-right text-xs font-semibold text-[#0EA5E9]">{fmtDur(r.avgMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Top unqualified reasons */}
            <Card title="Top Unqualified / Not-Interested Reasons">
              <p className="text-xs text-[#6B7280] mb-2">Not interested: <span className="font-semibold text-[#F26161]">{reasons.notInterested}</span> lead(s)</p>
              {reasons.rows.length === 0 ? <Empty hint="No unqualification reasons recorded yet." /> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                      <th className="py-2 pr-3">Reason</th>
                      <th className="py-2 pl-3 text-right w-16">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reasons.rows.map(([reason, count]) => (
                      <tr key={reason} className="border-b border-[#f3f4f6] last:border-0">
                        <td className="py-1.5 pr-3 text-xs text-[#374151]">{reason}</td>
                        <td className="py-1.5 pl-3 text-right text-xs font-semibold text-[#F26161]">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* Status distribution — both departments, table form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Telesales Status Distribution"><StatusDistTable statuses={tsStatuses} counts={tsCounts} /></Card>
            <Card title="Direct Sales Status Distribution"><StatusDistTable statuses={dsStatuses} counts={dsCounts} /></Card>
          </div>

          {/* Agent performance */}
          <Card title="Agent Performance">
            {agentPerf.length === 0 ? <Empty /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                      <th className="py-2 pr-3">Agent</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3 text-right">Leads</th>
                      <th className="py-2 px-3 text-right">Outcome</th>
                      <th className="py-2 pl-3 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentPerf.map((r) => (
                      <tr key={`${r.dept}-${r.agent.id}`} className="border-b border-[#f3f4f6] last:border-0">
                        <td className="py-1.5 pr-3 text-xs text-[#111827]">{r.agent.full_name}</td>
                        <td className="py-1.5 px-3 text-xs text-[#4B5563]">{r.dept}</td>
                        <td className="py-1.5 px-3 text-right text-xs text-[#4B5563]">{r.leads}</td>
                        <td className="py-1.5 px-3 text-right text-xs text-[#4B5563]">{r.outcome} <span className="text-[#9CA3AF]">{r.outcomeLabel}</span></td>
                        <td className="py-1.5 pl-3 text-right text-xs font-semibold text-[#22C55E]">{r.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function countBy(leads: CrmLead[], pick: (l: CrmLead) => string | null): Record<string, number> {
  const c: Record<string, number> = {}
  for (const l of leads) { const k = pick(l); if (k) c[k] = (c[k] ?? 0) + 1 }
  return c
}

function Kpi({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
      <p className="text-[11px] text-[#6B7280]">{label}</p>
      <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
      {hint && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{hint}</p>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#111827] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1.5 rounded-full bg-[#f3f4f6] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function Empty({ hint }: { hint?: string }) {
  return <p className="text-xs text-[#9CA3AF] py-4 text-center">{hint ?? 'No data for the current filters.'}</p>
}

const sel = 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
