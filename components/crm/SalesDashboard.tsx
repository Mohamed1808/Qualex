'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, LeadStatus, Project, LeadFilter } from '@/lib/crm/types'
import {
  listLeads, listStatuses, listProjects, updateLeadStatus, scheduleReminder, logContact,
} from '@/lib/crm/service'
import LeadHistoryDrawer from './LeadHistoryDrawer'

// Frontend demo: the "signed-in" sales agent. Backend replaces with the real session.
const CURRENT = { id: 'u-bahr', name: 'Mohamed Bahr' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD
}
function waLink(phone: string) {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '20')
  return `https://wa.me/${digits}`
}

export default function SalesDashboard() {
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [showStats, setShowStats] = useState(true)
  const [showFilter, setShowFilter] = useState(true)
  const [filter, setFilter] = useState<LeadFilter>({})
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')

  const [reminderFor, setReminderFor] = useState<CrmLead | null>(null)
  const [historyFor, setHistoryFor] = useState<CrmLead | null>(null)

  async function reload() {
    const [l, s, p] = await Promise.all([
      listLeads({ ...filter, search: search || undefined }),
      listStatuses(),
      listProjects(),
    ])
    setLeads(l)
    setStatuses(s)
    setProjects(p)
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search])

  const statusById = useMemo(() => Object.fromEntries(statuses.map((s) => [s.id, s])), [statuses])
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  // Statistics: counts per status across the (unfiltered by search) full set
  const [allLeads, setAllLeads] = useState<CrmLead[]>([])
  useEffect(() => { listLeads().then(setAllLeads) }, [])
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of allLeads) if (l.status_id) counts[l.status_id] = (counts[l.status_id] ?? 0) + 1
    return counts
  }, [allLeads])

  const visible = leads.slice(0, pageSize)

  async function changeStatus(lead: CrmLead, statusId: string) {
    await updateLeadStatus(lead.id, statusId, CURRENT.name)
    toast.success('Status updated')
    reload()
    listLeads().then(setAllLeads)
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-white">Sales Dashboard</h1>

      {/* ---------- Statistics ---------- */}
      <section className="bg-[#161616] border border-[#2a2a2a] rounded-xl">
        <button
          onClick={() => setShowStats((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-white"
        >
          Statistics
          <span className="text-[#6B7280]">{showStats ? '▲' : '▼'}</span>
        </button>
        {showStats && (
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter((f) => ({ ...f, status_id: f.status_id === s.id ? undefined : s.id }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  filter.status_id === s.id ? 'border-white/40' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                }`}
                style={{ backgroundColor: `${s.color}12` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[#cbd5e1]">{s.name}</span>
                <span className="font-bold" style={{ color: s.color }}>{statusCounts[s.id] ?? 0}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Filter ---------- */}
      <section className="bg-[#161616] border border-[#2a2a2a] rounded-xl">
        <button
          onClick={() => setShowFilter((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-white"
        >
          Filter
          <span className="text-[#6B7280]">{showFilter ? '▲' : '▼'}</span>
        </button>
        {showFilter && (
          <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">From date</label>
              <input type="date" value={filter.from?.slice(0, 10) ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                className="w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
            </div>
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">To date</label>
              <input type="date" value={filter.to?.slice(0, 10) ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined }))}
                className="w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
            </div>
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Status</label>
              <select value={filter.status_id ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, status_id: e.target.value || undefined }))}
                className="w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]">
                <option value="">All statuses</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Project</label>
              <select value={filter.project_id ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, project_id: e.target.value || undefined }))}
                className="w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]">
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-4">
              <button onClick={() => setFilter({})} className="text-xs text-[#5757e6] hover:text-[#7d7dee]">Reset filters</button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Datatable ---------- */}
      <section className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#1c1c22] border border-[#2a2a2a] text-white rounded-lg px-2 py-1 text-sm focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
            className="bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 w-56 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Quick Actions</th>
                <th className="px-3 py-3">Project</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Note</th>
                <th className="px-3 py-3">History</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-[#4B5563]">Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-[#4B5563]">No leads found</td></tr>
              ) : visible.map((lead) => {
                const status = lead.status_id ? statusById[lead.status_id] : undefined
                const project = lead.project_id ? projectById[lead.project_id] : undefined
                return (
                  <tr key={lead.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1c1c22] transition-colors">
                    <td className="px-3 py-3 text-[#9CA3AF] text-xs whitespace-nowrap">{fmtDate(lead.created_at)}</td>
                    <td className="px-3 py-3 text-[#5757e6] font-medium">{lead.name}</td>
                    <td className="px-3 py-3 text-[#9CA3AF] font-mono text-xs">{lead.phone}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Facebook */}
                        <a
                          href={lead.facebook_url ?? undefined}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => lead.facebook_url && logContact(lead.id, 'Facebook', CURRENT.name)}
                          title={lead.facebook_url ? 'Open Facebook' : 'No Facebook link'}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${lead.facebook_url ? 'bg-[#1877F2] text-white hover:opacity-80' : 'bg-[#2a2a2a] text-[#4B5563] pointer-events-none'}`}
                        >f</a>
                        {/* WhatsApp */}
                        <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer"
                          onClick={() => logContact(lead.id, 'WhatsApp', CURRENT.name)}
                          title="Contact on WhatsApp"
                          className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs hover:opacity-80">✆</a>
                        {/* Call */}
                        <a href={`tel:${lead.phone}`}
                          onClick={() => logContact(lead.id, 'Call', CURRENT.name)}
                          title="Call"
                          className="w-7 h-7 rounded-full bg-[#5757e6] text-white flex items-center justify-center text-xs hover:opacity-80">☎</a>
                        {/* Self reminder */}
                        <button onClick={() => setReminderFor(lead)} title="Schedule a reminder"
                          className="w-7 h-7 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center text-xs hover:bg-[#F59E0B]/30">🔔</button>
                        {/* Unified WhatsApp chat */}
                        <a href={`/crm/whatsapp?lead=${lead.id}`} title="Company WhatsApp chat"
                          className="ml-1 flex items-center gap-1 px-2.5 h-7 rounded-lg bg-[#7C3AED] text-white text-xs font-medium hover:bg-[#6D28D9]">
                          💬 Chat
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {project ? (
                        <span className="text-xs px-2 py-1 rounded bg-[#5757e6]/15 text-[#7d7dee]">{project.name}</span>
                      ) : <span className="text-[#4B5563] text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={lead.status_id ?? ''}
                        onChange={(e) => changeStatus(lead, e.target.value)}
                        className="bg-[#1c1c22] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs focus:outline-none"
                        style={{ color: status?.color ?? '#9CA3AF' }}
                      >
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id} style={{ color: '#fff', backgroundColor: '#1c1c22' }}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#9CA3AF]">{lead.expire_note ?? '—'}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => setHistoryFor(lead)}
                        className="text-xs text-[#5757e6] hover:underline">View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#6B7280] mt-3">Showing {visible.length} of {leads.length} entries</p>
      </section>

      {reminderFor && (
        <ReminderModal lead={reminderFor} onClose={() => setReminderFor(null)} />
      )}
      {historyFor && (
        <LeadHistoryDrawer lead={historyFor} currentUser={CURRENT} onClose={() => { setHistoryFor(null); reload() }} />
      )}
    </div>
  )
}

function ReminderModal({ lead, onClose }: { lead: CrmLead; onClose: () => void }) {
  const [at, setAt] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!at) { toast.error('Pick a date & time'); return }
    setSaving(true)
    await scheduleReminder(CURRENT.id, lead.id, new Date(at).toISOString(), note)
    setSaving(false)
    toast.success('Reminder scheduled')
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-1">Schedule reminder</h3>
        <p className="text-xs text-[#6B7280] mb-4">Follow-up on {lead.name} · {lead.phone}</p>
        <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">When</label>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)}
          className="w-full mt-1 mb-3 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Note</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Call back about villa pricing"
          className="w-full mt-1 mb-4 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2">
            {saving ? 'Saving…' : 'Schedule'}
          </button>
          <button onClick={onClose} className="px-4 text-sm text-[#6B7280] hover:text-white border border-[#2a2a2a] rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  )
}
