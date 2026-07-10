'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import type { CrmLead, LeadStatus, Project, CrmUser, LeadFilter, LeadChannel } from '@/lib/crm/types'
import {
  listLeads, listStatuses, listProjects, listUsers, createLead, importLeads,
  updateLeadStatus, assignLead,
} from '@/lib/crm/service'
import LeadHistoryDrawer from './LeadHistoryDrawer'

const ACTOR = { id: 'u-admin', name: 'Mohamed Moheb' }

export default function LeadManagement() {
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [filter, setFilter] = useState<LeadFilter>({})
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [historyFor, setHistoryFor] = useState<CrmLead | null>(null)

  async function reload() {
    const [l, s, p, u] = await Promise.all([
      listLeads({ ...filter, search: search || undefined }), listStatuses(), listProjects(), listUsers(),
    ])
    setLeads(l); setStatuses(s); setProjects(p); setUsers(u)
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [filter, search])

  const statusById = useMemo(() => Object.fromEntries(statuses.map((s) => [s.id, s])), [statuses])
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const agents = users.filter((u) => u.role.includes('agent'))

  function exportCsv() {
    const rows = leads.map((l) => ({
      Date: new Date(l.created_at).toLocaleDateString('en-CA'),
      Name: l.name, Phone: l.phone,
      Project: projectById[l.project_id ?? '']?.name ?? '',
      Status: statusById[l.status_id ?? '']?.name ?? '',
      Assigned: users.find((u) => u.id === l.assigned_user_id)?.full_name ?? '',
      Facebook: l.facebook_url ?? '',
    }))
    const csv = Papa.unparse(rows)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `leads-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Lead Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{leads.length} leads</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="border border-[#e5e7eb] text-[#4B5563] hover:text-[#111827] text-sm rounded-lg px-4 py-2">⬇ Export CSV</button>
          <button onClick={() => setAdding(true)} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2">+ Add Leads</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <input type="date" value={filter.from?.slice(0, 10) ?? ''} onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className={sel} />
        <input type="date" value={filter.to?.slice(0, 10) ?? ''} onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined }))} className={sel} />
        <select value={filter.status_id ?? ''} onChange={(e) => setFilter((f) => ({ ...f, status_id: e.target.value || undefined }))} className={sel}>
          <option value="">All statuses</option>{statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filter.project_id ?? ''} onChange={(e) => setFilter((f) => ({ ...f, project_id: e.target.value || undefined }))} className={sel}>
          <option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filter.assigned_user_id ?? ''} onChange={(e) => setFilter((f) => ({ ...f, assigned_user_id: e.target.value || undefined }))} className={sel}>
          <option value="">All agents</option>{agents.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…" className={`${sel} col-span-2 md:col-span-4`} />
        <button onClick={() => { setFilter({}); setSearch('') }} className="text-xs text-[#5757e6] hover:text-[#4444cc]">Reset</button>
      </div>

      {/* Table */}
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">History</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const status = l.status_id ? statusById[l.status_id] : undefined
                return (
                  <tr key={l.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                    <td className="px-4 py-3 text-[#4B5563] text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleDateString('en-CA')}</td>
                    <td className="px-4 py-3 text-[#111827]">{l.name}</td>
                    <td className="px-4 py-3 text-[#4B5563] font-mono text-xs">{l.phone}</td>
                    <td className="px-4 py-3 text-xs text-[#4B5563]">{projectById[l.project_id ?? '']?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <select value={l.status_id ?? ''} onChange={async (e) => { await updateLeadStatus(l.id, e.target.value, ACTOR.name); reload() }}
                        className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg px-2 py-1 text-xs focus:outline-none" style={{ color: status?.color ?? '#4B5563' }}>
                        {statuses.map((s) => <option key={s.id} value={s.id} style={{ color: '#fff', backgroundColor: '#f3f4f6' }}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={l.assigned_user_id ?? ''} onChange={async (e) => { await assignLead(l.id, e.target.value || null, ACTOR.name); reload() }}
                        className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] rounded-lg px-2 py-1 text-xs focus:outline-none">
                        <option value="">Unassigned</option>
                        {agents.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><button onClick={() => setHistoryFor(l)} className="text-xs text-[#5757e6] hover:underline">View</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {adding && <AddLeads projects={projects} statuses={statuses} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload() }} />}
      {historyFor && <LeadHistoryDrawer lead={historyFor} currentUser={ACTOR} onClose={() => { setHistoryFor(null); reload() }} />}
    </div>
  )
}

function AddLeads({ projects, statuses, onClose, onDone }: { projects: Project[]; statuses: LeadStatus[]; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'manual' | 'import'>('manual')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [facebook, setFacebook] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const defaultStatus = statuses.find((s) => s.is_default)?.id ?? statuses[0]?.id ?? null

  async function saveManual() {
    if (!name.trim() || !phone.trim()) { toast.error('Name and phone required'); return }
    setSaving(true)
    await createLead({ name: name.trim(), phone: phone.trim(), facebook_url: facebook.trim() || null, channel: 'call_center', project_id: projectId || null, status_id: defaultStatus, assigned_user_id: null, expire_note: null })
    setSaving(false)
    toast.success('Lead added')
    onDone()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const rows = (res.data as Record<string, string>[])
          .map((r) => ({
            name: r.name || r.Name || '', phone: r.phone || r.Phone || r.mobile || '',
            facebook_url: r.facebook || r.Facebook || null,
            channel: 'call_center' as LeadChannel, project_id: projectId || null,
            status_id: defaultStatus, assigned_user_id: null, expire_note: null,
          }))
          .filter((r) => r.name && r.phone)
        if (rows.length === 0) { toast.error('No valid rows (need name + phone columns)'); return }
        const n = await importLeads(rows)
        toast.success(`Imported ${n} leads`)
        onDone()
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#111827]">Add Leads</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">✕</button>
        </div>
        <div className="flex gap-1 mb-4 border-b border-[#e5e7eb]">
          {(['manual', 'import'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${mode === m ? 'text-[#5757e6] border-[#5757e6]' : 'text-[#6B7280] border-transparent'}`}>{m}</button>
          ))}
        </div>

        <div className="mb-3">
          <label className={lbl}>Project</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={sel}>
            <option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {mode === 'manual' ? (
          <div className="space-y-3">
            <div><label className={lbl}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={sel} /></div>
            <div><label className={lbl}>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={sel} placeholder="01xxxxxxxxx" /></div>
            <div><label className={lbl}>Facebook URL (optional)</label><input value={facebook} onChange={(e) => setFacebook(e.target.value)} className={sel} /></div>
            <button onClick={saveManual} disabled={saving} className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2">{saving ? 'Saving…' : 'Add Lead'}</button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-[#4B5563] mb-3">Upload a CSV with <span className="text-[#111827] font-mono">name, phone</span> columns (optional <span className="font-mono">facebook</span>). Leads go into the selected project.</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={onFile}
              className="block w-full text-xs text-[#4B5563] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#5757e6] file:text-white file:text-sm file:cursor-pointer" />
          </div>
        )}
      </div>
    </div>
  )
}

const sel = 'w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
const lbl = 'text-[10px] text-[#6B7280] uppercase tracking-wide'
