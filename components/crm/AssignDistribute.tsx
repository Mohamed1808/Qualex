'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, CrmUser, Project, LeadStatus, DistributionSchedule, Cadence } from '@/lib/crm/types'
import {
  listLeads, listUsers, listProjects, listStatuses, assignLead,
  listDistributions, createDistribution, runDistribution, updateDistribution,
} from '@/lib/crm/service'
import PageHeader from './ui/PageHeader'
import EmptyState from './ui/EmptyState'

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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Assign & Distribute" />

      <div className="flex gap-1 border-b border-[#e5e7eb] overflow-x-auto">
        {([['assign', 'Manual Assign'], ['move', 'Move Lead'], ['schedule', 'Scheduled Distribution']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === k ? 'text-[#5757e6] border-[#5757e6]' : 'text-[#6B7280] border-transparent hover:text-[#111827]'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'assign' && <ManualAssign leads={leads} agents={agents} projects={projects} onDone={reload} />}
      {tab === 'move' && <MoveLead leads={leads} agents={agents} onDone={reload} />}
      {tab === 'schedule' && (
        <ScheduleDistribution leads={leads} distributions={distributions} projects={projects} statuses={statuses} agents={agents} onDone={reload} />
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
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <button onClick={add} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-6 py-2 transition-colors">Add Lead</button>
        </div>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Pro ID</th><th className="px-4 py-3">Pro Name</th><th className="px-4 py-3 text-right">Not Assigned Leads</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={3}><EmptyState icon="🏗️" title="No projects yet" /></td></tr>
              ) : projects.map((p) => (
                <tr key={p.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                  <td className="px-4 py-3 text-[#4B5563] font-mono text-xs">{p.id.slice(0, 6)}</td>
                  <td className="px-4 py-3 text-[#111827]">{p.name}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: (unassignedByProject[p.id] ?? 0) > 0 ? '#5757e6' : '#4B5563' }}>
                    {unassignedByProject[p.id] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              <th className="px-4 py-3">Lead</th><th className="px-4 py-3">Currently with</th><th className="px-4 py-3">Move to</th>
            </tr>
          </thead>
          <tbody>
            {assigned.length === 0 ? (
              <tr><td colSpan={3}><EmptyState icon="🔀" title="No assigned leads to move" /></td></tr>
            ) : assigned.map((l) => (
              <tr key={l.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                <td className="px-4 py-3"><span className="text-[#111827]">{l.name}</span> <span className="text-[#6B7280] font-mono text-xs">{l.phone}</span></td>
                <td className="px-4 py-3 text-[#4B5563] text-xs">{nameOf(l.assigned_user_id)}</td>
                <td className="px-4 py-3">
                  <select defaultValue="" onChange={(e) => move(l.id, e.target.value)}
                    className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1 focus:outline-none">
                    <option value="">Select agent…</option>
                    {agents.filter((a) => a.id !== l.assigned_user_id).map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScheduleDistribution({ leads, distributions, projects, statuses, agents, onDone }: {
  leads: CrmLead[]; distributions: DistributionSchedule[]; projects: Project[]; statuses: LeadStatus[]; agents: CrmUser[]; onDone: () => void
}) {
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [perUser, setPerUser] = useState(10)
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [targets, setTargets] = useState<string[]>([])
  const [touched, setTouched] = useState(false)
  const [previewFor, setPreviewFor] = useState<DistributionSchedule | null>(null)

  const nameError = touched && !name.trim() ? 'Name is required' : null
  const targetsError = touched && targets.length === 0 ? 'Pick at least one target user' : null

  function poolFor(d: Pick<DistributionSchedule, 'project_id' | 'source_status_id'>) {
    return leads.filter((l) => !l.assigned_user_id
      && (!d.project_id || l.project_id === d.project_id)
      && (!d.source_status_id || l.status_id === d.source_status_id))
  }

  async function create() {
    setTouched(true)
    if (!name.trim() || targets.length === 0) { toast.error('Name and at least one target user required'); return }
    await createDistribution({
      name: name.trim(), project_id: projectId || null, source_status_id: statusId || null,
      per_user_count: perUser, cadence, target_user_ids: targets, is_active: true,
    })
    setName(''); setTargets([]); setTouched(false)
    toast.success('Distribution schedule created')
    onDone()
  }
  async function run(id: string) {
    const n = await runDistribution(id, ACTOR)
    toast.success(`Distributed ${n} lead(s)`)
    setPreviewFor(null)
    onDone()
  }
  async function toggle(d: DistributionSchedule) {
    await updateDistribution(d.id, { is_active: !d.is_active })
    onDone()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#111827]">New schedule</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} className={errCls(sel, !!nameError)} placeholder="e.g. Morning top-up" />
            {nameError && <p className={errText}>{nameError}</p>}
          </div>
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
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${on ? 'border-[#5757e6] bg-[#5757e6]/15 text-[#4444cc]' : 'border-[#e5e7eb] text-[#4B5563] hover:border-[#d1d5db]'}`}>
                  {a.full_name}
                </button>
              )
            })}
          </div>
          {targetsError && <p className={errText}>{targetsError}</p>}
        </div>
        <p className="text-xs text-[#6B7280]">
          Pool available now: <span className="font-semibold text-[#111827]">{poolFor({ project_id: projectId || null, source_status_id: statusId || null }).length}</span> unassigned lead(s) match these filters.
        </p>
        <button onClick={create} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">Create schedule</button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Per user</th><th className="px-4 py-3">Cadence</th><th className="px-4 py-3">Targets</th><th className="px-4 py-3">Last run</th><th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {distributions.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon="🎯" title="No schedules yet" hint="Create one above to auto-distribute unassigned leads." /></td></tr>
              ) : distributions.map((d) => (
                <tr key={d.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                  <td className="px-4 py-3 text-[#111827]">{d.name}{!d.is_active && <span className="ml-2 text-[10px] text-[#6B7280]">(paused)</span>}</td>
                  <td className="px-4 py-3 text-[#4B5563]">{d.per_user_count}</td>
                  <td className="px-4 py-3 text-[#4B5563] capitalize">{d.cadence}</td>
                  <td className="px-4 py-3 text-[#4B5563]">{d.target_user_ids.length}</td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">{d.last_run_at ? new Date(d.last_run_at).toLocaleString() : 'never'}</td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setPreviewFor(d)} className="text-xs text-[#22C55E] hover:underline">Run now</button>
                    <button onClick={() => toggle(d)} className="text-xs text-[#4B5563] hover:text-[#111827]">{d.is_active ? 'Pause' : 'Resume'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-[#4B5563]">Note: automatic firing on a timer is wired to the backend later; “Run now” executes the distribution immediately.</p>

      {previewFor && (() => {
        const pool = poolFor(previewFor)
        const perAgent = pool.length > 0 ? Math.min(previewFor.per_user_count, Math.ceil(pool.length / previewFor.target_user_ids.length)) : 0
        const totalToAssign = Math.min(pool.length, previewFor.per_user_count * previewFor.target_user_ids.length)
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setPreviewFor(null)}>
            <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-[#111827] mb-1">Run &ldquo;{previewFor.name}&rdquo;?</h3>
              {pool.length === 0 ? (
                <p className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 rounded-lg px-3 py-2 mb-4">No unassigned leads currently match this schedule&apos;s filters.</p>
              ) : (
                <p className="text-xs text-[#6B7280] mb-4">
                  <span className="font-semibold text-[#111827]">{totalToAssign}</span> of {pool.length} unassigned matching lead(s) will be distributed across{' '}
                  <span className="font-semibold text-[#111827]">{previewFor.target_user_ids.length}</span> agent(s) — up to{' '}
                  <span className="font-semibold text-[#111827]">{perAgent}</span> each.
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => run(previewFor.id)} disabled={pool.length === 0}
                  className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">Run now</button>
                <button onClick={() => setPreviewFor(null)} className="px-4 text-sm text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function errCls(base: string, hasError: boolean) {
  return hasError ? base.replace('border-[#e5e7eb]', 'border-[#F26161]').replace('focus:ring-[#5757e6]', 'focus:ring-[#F26161]') : base
}

const sel = 'w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
const lbl = 'text-[10px] text-[#6B7280] uppercase tracking-wide'
const errText = 'text-[11px] text-[#F26161] mt-1'
