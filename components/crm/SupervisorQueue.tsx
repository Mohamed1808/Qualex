'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, CrmUser, LeadStage } from '@/lib/crm/types'
import { listLeads, listUsers, assignTelesales, assignDirectSales } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import LeadWorkDrawer from './LeadWorkDrawer'
import LeadHistoryDrawer from './LeadHistoryDrawer'

const STAGES: Record<'telesales' | 'direct_sales', LeadStage[]> = {
  telesales: ['new', 'telesales_assigned', 'telesales_in_progress'],
  direct_sales: ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'],
}

export default function SupervisorQueue({ team }: { team: 'telesales' | 'direct_sales' }) {
  const { user } = useSession()
  const CURRENT = { id: user.id, name: user.full_name, role: user.role }
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('')
  const [search, setSearch] = useState('')
  const [workFor, setWorkFor] = useState<CrmLead | null>(null)
  const [historyFor, setHistoryFor] = useState<CrmLead | null>(null)

  async function reload() {
    const [l, u] = await Promise.all([listLeads(), listUsers()])
    setLeads(l.filter((x) => STAGES[team].includes(x.stage)))
    setUsers(u)
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [team])

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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-[#111827]">{team === 'telesales' ? 'Telesales' : 'Direct Sales'} Live Queue</h1>

      {/* stage counts */}
      <div className="flex flex-wrap gap-2">
        {STAGES[team].map((st) => (
          <button key={st} onClick={() => setStageFilter((s) => s === st ? '' : st)}
            className={`text-xs px-3 py-2 rounded-lg border capitalize ${stageFilter === st ? 'border-[#5757e6] text-[#4444cc] bg-[#5757e6]/10' : 'border-[#e5e7eb] text-[#4B5563] hover:border-[#d1d5db]'}`}>
            {st.replace(/_/g, ' ')} <span className="font-bold text-[#111827]">{counts[st] ?? 0}</span>
          </button>
        ))}
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…"
        className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />

      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Agent</th><th className="px-4 py-3">Assign</th><th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const agentId = team === 'telesales' ? l.assigned_telesales_agent : l.assigned_direct_sales_agent
                const agent = users.find((u) => u.id === agentId)
                return (
                  <tr key={l.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6]">
                    <td className="px-4 py-3 text-[#111827]">{l.name}</td>
                    <td className="px-4 py-3 text-[#4B5563] font-mono text-xs">{l.phone}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-[#5757e6]/15 text-[#4444cc] capitalize">{l.stage.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-xs text-[#4B5563]">{agent?.full_name ?? <span className="text-[#F59E0B]">Unassigned</span>}</td>
                    <td className="px-4 py-3">
                      <select value="" onChange={(e) => assign(l, e.target.value)} className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1 focus:outline-none">
                        <option value="">{agent ? 'Reassign…' : 'Assign…'}</option>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => setWorkFor(l)} className="text-xs text-[#5757e6] hover:underline mr-2">Open</button>
                      <button onClick={() => setHistoryFor(l)} className="text-xs text-[#6B7280] hover:text-[#111827]">History</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#4B5563]">No leads in this queue.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {workFor && <LeadWorkDrawer lead={workFor} currentUser={CURRENT} onChanged={reload} onClose={() => setWorkFor(null)} />}
      {historyFor && <LeadHistoryDrawer lead={historyFor} currentUser={CURRENT} onClose={() => setHistoryFor(null)} />}
    </div>
  )
}
