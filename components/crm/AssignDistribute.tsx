'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, CrmUser, Project, LeadStatus, DistributionSchedule, Cadence } from '@/lib/crm/types'
import {
  listLeads, listUsers, listProjects, listStatuses, assignLead,
  listDistributions, createDistribution, runDistribution, updateDistribution,
} from '@/lib/crm/service'

const ACTOR = 'Mohamed Moheb'

export default function AssignDistribute() {
  const [tab, setTab] = useState<'assign' | 'move' | 'schedule'>('assign')
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [distributions, setDistributions] = useState<DistributionSchedule[]>([])

  async function reload() {
    const [l, u, p, s, d] = await Promise.all([listLeads(), listUsers(), listProjects(), listStatuses(), listDistributions()])
    setLeads(l); setUsers(u); setProjects(p); setStatuses(s); setDistributions(d)
  }
  useEffect(() => { reload() }, [])

  const agents = users.filter((u) => u.role.includes('agent') && u.is_active)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-white">Assign & Distribute</h1>

      <div className="flex gap-1 border-b border-[#2a2a2a]">
        {([['assign', 'Manual Assign'], ['move', 'Move Lead'], ['schedule', 'Scheduled Distribution']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === k ? 'text-[#5757e6] border-[#5757e6]' : 'text-[#6B7280] border-transparent hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'assign' && <ManualAssign leads={leads} agents={agents} projects={projects} onDone={reload} />}
      {tab === 'move' && <MoveLead leads={leads} agents={agents} onDone={reload} />}
      {tab === 'schedule' && (
        <ScheduleDistribution distributions={distributions} projects={projects} statuses={statuses} agents={agents} onDone={reload} />
      )}
    </div>
  )
}

function ManualAssign({ leads, agents, projects, onDone }: { leads: CrmLead[]; agents: CrmUser[]; projects: Project[]; onDone: () => void }) {
  const [projectId, setProjectId] = useState('')
  const [userId, setUserId] = useState('')
  const [count, setCount] = useState(5)

  const unassignedByProject = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of leads) if (!l.assigned_user_id && l.project_id) m[l.project_id] = (m[l.project_id] ?? 0) + 1
    return m
  }, [leads])

  async function add() {
    if (!projectId || !userId) { toast.error('Pick a project and a user'); return }
    const pool = leads.filter((l) => !l.assigned_user_id && l.project_id === projectId).slice(0, count)
    if (pool.length === 0) { toast.error('No unassigned leads in this project'); return }
    for (const lead of pool) await assignLead(lead.id, userId, ACTOR)
    toast.success(`Assigned ${pool.length} lead(s)`)
    onDone()
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={sel}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={sel}>
              <option value="">Select user…</option>
              {agents.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">How many</label>
            <input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} className={sel} />
          </div>
        </div>
        <div className="text-center">
          <button onClick={add} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-6 py-2">Add Lead</button>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              <th className="px-4 py-3">Pro ID</th><th className="px-4 py-3">Pro Name</th><th className="px-4 py-3 text-right">Not Assigned Leads</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-[#2a2a2a] last:border-0">
                <td className="px-4 py-3 text-[#9CA3AF] font-mono text-xs">{p.id.slice(0, 6)}</td>
                <td className="px-4 py-3 text-white">{p.name}</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: (unassignedByProject[p.id] ?? 0) > 0 ? '#5757e6' : '#4B5563' }}>
                  {unassignedByProject[p.id] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MoveLead({ leads, agents, onDone }: { leads: CrmLead[]; agents: CrmUser[]; onDone: () => void }) {
  const assigned = leads.filter((l) => l.assigned_user_id)
  const nameOf = (id: string | null) => agents.find((a) => a.id === id)?.full_name ?? '—'
  async function move(leadId: string, toUser: string) {
    if (!toUser) return
    await assignLead(leadId, toUser, ACTOR)
    toast.success('Lead moved')
    onDone()
  }
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2a2a] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
            <th className="px-4 py-3">Lead</th><th className="px-4 py-3">Currently with</th><th className="px-4 py-3">Move to</th>
          </tr>
        </thead>
        <tbody>
          {assigned.map((l) => (
            <tr key={l.id} className="border-b border-[#2a2a2a] last:border-0">
              <td className="px-4 py-3"><span className="text-white">{l.name}</span> <span className="text-[#6B7280] font-mono text-xs">{l.phone}</span></td>
              <td className="px-4 py-3 text-[#9CA3AF] text-xs">{nameOf(l.assigned_user_id)}</td>
              <td className="px-4 py-3">
                <select defaultValue="" onChange={(e) => move(l.id, e.target.value)}
                  className="bg-[#1c1c22] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
                  <option value="">Select agent…</option>
                  {agents.filter((a) => a.id !== l.assigned_user_id).map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {assigned.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-[#4B5563]">No assigned leads.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function ScheduleDistribution({ distributions, projects, statuses, agents, onDone }: {
  distributions: DistributionSchedule[]; projects: Project[]; statuses: LeadStatus[]; agents: CrmUser[]; onDone: () => void
}) {
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [perUser, setPerUser] = useState(10)
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [targets, setTargets] = useState<string[]>([])

  async function create() {
    if (!name.trim() || targets.length === 0) { toast.error('Name and at least one target user required'); return }
    await createDistribution({
      name: name.trim(), project_id: projectId || null, source_status_id: statusId || null,
      per_user_count: perUser, cadence, target_user_ids: targets, is_active: true,
    })
    setName(''); setTargets([])
    toast.success('Distribution schedule created')
    onDone()
  }
  async function run(id: string) {
    const n = await runDistribution(id, ACTOR)
    toast.success(`Distributed ${n} lead(s)`)
    onDone()
  }
  async function toggle(d: DistributionSchedule) {
    await updateDistribution(d.id, { is_active: !d.is_active })
    onDone()
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">New schedule</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className={lbl}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={sel} placeholder="e.g. Morning top-up" /></div>
          <div><label className={lbl}>Leads per user each run</label><input type="number" min={1} value={perUser} onChange={(e) => setPerUser(Number(e.target.value))} className={sel} /></div>
          <div><label className={lbl}>Project (optional pool)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={sel}><option value="">Any</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div><label className={lbl}>Source status (optional)</label>
            <select value={statusId} onChange={(e) => setStatusId(e.target.value)} className={sel}><option value="">Any</option>{statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <div><label className={lbl}>Cadence</label>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} className={sel}>
              <option value="once">Once</option><option value="hourly">Hourly</option><option value="daily">Daily</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Target users</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {agents.map((a) => {
              const on = targets.includes(a.id)
              return (
                <button key={a.id} onClick={() => setTargets((t) => on ? t.filter((x) => x !== a.id) : [...t, a.id])}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${on ? 'border-[#5757e6] bg-[#5757e6]/15 text-[#7d7dee]' : 'border-[#2a2a2a] text-[#9CA3AF] hover:border-[#3a3a3a]'}`}>
                  {a.full_name}
                </button>
              )
            })}
          </div>
        </div>
        <button onClick={create} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-5 py-2">Create schedule</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              <th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Per user</th><th className="px-4 py-3">Cadence</th><th className="px-4 py-3">Targets</th><th className="px-4 py-3">Last run</th><th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {distributions.map((d) => (
              <tr key={d.id} className="border-b border-[#2a2a2a] last:border-0">
                <td className="px-4 py-3 text-white">{d.name}{!d.is_active && <span className="ml-2 text-[10px] text-[#6B7280]">(paused)</span>}</td>
                <td className="px-4 py-3 text-[#9CA3AF]">{d.per_user_count}</td>
                <td className="px-4 py-3 text-[#9CA3AF] capitalize">{d.cadence}</td>
                <td className="px-4 py-3 text-[#9CA3AF]">{d.target_user_ids.length}</td>
                <td className="px-4 py-3 text-[#6B7280] text-xs">{d.last_run_at ? new Date(d.last_run_at).toLocaleString() : 'never'}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => run(d.id)} className="text-xs text-[#22C55E] hover:underline">Run now</button>
                  <button onClick={() => toggle(d)} className="text-xs text-[#9CA3AF] hover:text-white">{d.is_active ? 'Pause' : 'Resume'}</button>
                </td>
              </tr>
            ))}
            {distributions.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#4B5563]">No schedules yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[#4B5563]">Note: automatic firing on a timer is wired to the backend later; “Run now” executes the distribution immediately.</p>
    </div>
  )
}

const sel = 'w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
const lbl = 'text-[10px] text-[#6B7280] uppercase tracking-wide'
