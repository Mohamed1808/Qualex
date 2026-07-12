'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, CrmUser, LeadStage } from '@/lib/crm/types'
import { listLeads, listUsers, assignTelesales, assignDirectSales } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import LeadWorkDrawer from './LeadWorkDrawer'
import LeadHistoryDrawer from './LeadHistoryDrawer'
import PageHeader from './ui/PageHeader'
import { StagePill, stageColor } from './ui/Pill'
import { TableSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'
import { DensityToggle, useDensity } from './ui/useDensity'

const STAGES: Record<'telesales' | 'direct_sales', LeadStage[]> = {
  telesales: ['new', 'telesales_assigned', 'telesales_in_progress'],
  direct_sales: ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'],
}

export default function SupervisorQueue({ team }: { team: 'telesales' | 'direct_sales' }) {
  const { user } = useSession()
  const CURRENT = { id: user.id, name: user.full_name, role: user.role }
  const { density, setDensity, rowPad } = useDensity()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [workFor, setWorkFor] = useState<CrmLead | null>(null)
  const [historyFor, setHistoryFor] = useState<CrmLead | null>(null)

  async function reload() {
    const [l, u] = await Promise.all([listLeads(), listUsers()])
    setLeads(l.filter((x) => STAGES[team].includes(x.stage)))
    setUsers(u)
    setLoading(false)
  }
  useEffect(() => { setLoading(true); reload() /* eslint-disable-next-line */ }, [team])

  const agents = users.filter((u) => u.role === (team === 'telesales' ? 'telesales_agent' : 'direct_sales_agent'))
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads) c[l.stage] = (c[l.stage] ?? 0) + 1
    return c
  }, [leads])

  const filtered = leads.filter((l) =>
    (!stageFilter || l.stage === stageFilter) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search))
  )

  async function assign(lead: CrmLead, agentId: string) {
    if (!agentId) return
    if (team === 'telesales') await assignTelesales(lead.id, agentId, CURRENT.name)
    else await assignDirectSales(lead.id, agentId, CURRENT.name)
    toast.success('Lead assigned')
    reload()
  }

  const label = team === 'telesales' ? 'Telesales' : 'Direct Sales'

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title={`${label} Live Queue`} subtitle={`${filtered.length} of ${leads.length} leads`} />

      {/* stage counts */}
      <div className="flex flex-wrap gap-2">
        {STAGES[team].map((st) => (
          <button key={st} onClick={() => setStageFilter((s) => s === st ? '' : st)}
            className={`text-xs px-3 py-2 rounded-lg border capitalize transition-colors ${
              stageFilter === st ? 'ring-1' : 'border-[#e5e7eb] text-[#4B5563] hover:border-[#d1d5db]'
            }`}
            style={stageFilter === st ? { borderColor: stageColor(st), color: stageColor(st), backgroundColor: `${stageColor(st)}10` } : undefined}
          >
            {st.replace(/_/g, ' ')} <span className="font-bold text-[#111827]">{counts[st] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…"
          className="flex-1 min-w-[200px] bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        <DensityToggle density={density} onChange={setDensity} />
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Agent</th><th className="px-4 py-3">Assign</th><th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} cols={6} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState icon="📋" title="No leads in this queue"
                    hint={stageFilter || search ? 'Try a different stage or search term.' : `Leads will appear here as they enter ${label.toLowerCase()}.`} />
                </td></tr>
              ) : filtered.map((l) => {
                const agentId = team === 'telesales' ? l.assigned_telesales_agent : l.assigned_direct_sales_agent
                const agent = users.find((u) => u.id === agentId)
                return (
                  <tr key={l.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors"
                    style={{ boxShadow: `inset 3px 0 0 ${stageColor(l.stage)}` }}>
                    <td className={`px-4 ${rowPad} text-[#111827]`}>{l.name}</td>
                    <td className={`px-4 ${rowPad} text-[#4B5563] font-mono text-xs`}>{l.phone}</td>
                    <td className={`px-4 ${rowPad}`}><StagePill stage={l.stage} /></td>
                    <td className={`px-4 ${rowPad} text-xs text-[#4B5563]`}>{agent?.full_name ?? <span className="text-[#F59E0B]">Unassigned</span>}</td>
                    <td className={`px-4 ${rowPad}`}>
                      <select value="" onChange={(e) => assign(l, e.target.value)} className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1 focus:outline-none">
                        <option value="">{agent ? 'Reassign…' : 'Assign…'}</option>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                      </select>
                    </td>
                    <td className={`px-4 ${rowPad} whitespace-nowrap`}>
                      <button onClick={() => setWorkFor(l)} className="text-xs text-[#5757e6] hover:underline mr-2">Open</button>
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
