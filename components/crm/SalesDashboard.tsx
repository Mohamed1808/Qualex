'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { CrmLead, LeadStatus, Project, LeadFilter, LeadChannel } from '@/lib/crm/types'
import {
  listLeads, listStatuses, listProjects, updateLeadStatus, scheduleReminder,
} from '@/lib/crm/service'
import LeadHistoryDrawer from './LeadHistoryDrawer'
import LeadWorkDrawer from './LeadWorkDrawer'
import { useSession } from '@/lib/crm/session'
import PageHeader from './ui/PageHeader'
import { Pill } from './ui/Pill'
import { TableSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'
import { DensityToggle, useDensity } from './ui/useDensity'
import { CHANNELS, CHANNEL_LABELS, CHANNEL_COLORS } from '@/lib/crm/constants'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD
}

export default function SalesDashboard() {
  const { user, isManager } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const CURRENT = { id: user.id, name: user.full_name, role: user.role }
  // Sales agents see only their own leads; managers see everything.
  const scope = isManager ? {} : { assigned_user_id: user.id }
  const { density, setDensity, rowPad } = useDensity()

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
  const [workFor, setWorkFor] = useState<CrmLead | null>(null)

  async function reload() {
    const [l, s, p] = await Promise.all([
      listLeads({ ...scope, ...filter, search: search || undefined }),
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
  }, [filter, search, user.id])

  // Deep-link from a notification: ?lead=<id> auto-opens the work drawer, then clears the param.
  useEffect(() => {
    const leadId = searchParams.get('lead')
    if (!leadId || leads.length === 0) return
    const match = leads.find((l) => l.id === leadId)
    if (match) setWorkFor(match)
    router.replace('/crm/sales')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, leads])

  const statusById = useMemo(() => Object.fromEntries(statuses.map((s) => [s.id, s])), [statuses])
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  // Statistics: counts per status across the (unfiltered by search) full set
  const [allLeads, setAllLeads] = useState<CrmLead[]>([])
  useEffect(() => { listLeads(scope).then(setAllLeads) }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of allLeads) if (l.status_id) counts[l.status_id] = (counts[l.status_id] ?? 0) + 1
    return counts
  }, [allLeads])

  const visible = leads.slice(0, pageSize)
  const hasFilters = Boolean(filter.status_id || filter.project_id || filter.channel || filter.from || filter.to || search)

  async function changeStatus(lead: CrmLead, statusId: string) {
    await updateLeadStatus(lead.id, statusId, CURRENT.name)
    toast.success('Status updated')
    reload()
    listLeads(scope).then(setAllLeads)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Sales Dashboard" subtitle={`${leads.length} leads in view`} />

      {/* ---------- Statistics ---------- */}
      <section className="bg-white border border-[#e5e7eb] rounded-xl">
        <button
          onClick={() => setShowStats((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-[#111827]"
        >
          Statistics
          <span className="text-[#6B7280] text-xs">{showStats ? '▲' : '▼'}</span>
        </button>
        {showStats && (
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter((f) => ({ ...f, status_id: f.status_id === s.id ? undefined : s.id }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  filter.status_id === s.id ? 'border-[#5757e6] ring-1 ring-[#5757e6]' : 'border-[#e5e7eb] hover:border-[#d1d5db]'
                }`}
                style={{ backgroundColor: `${s.color}12` }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[#374151]">{s.name}</span>
                <span className="font-bold" style={{ color: s.color }}>{statusCounts[s.id] ?? 0}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Filter ---------- */}
      <section className="bg-white border border-[#e5e7eb] rounded-xl">
        <button
          onClick={() => setShowFilter((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-[#111827]"
        >
          <span className="flex items-center gap-2">
            Filter
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#5757e6]" />}
          </span>
          <span className="text-[#6B7280] text-xs">{showFilter ? '▲' : '▼'}</span>
        </button>
        {showFilter && (
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">From date</label>
              <input type="date" value={filter.from?.slice(0, 10) ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
            </div>
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">To date</label>
              <input type="date" value={filter.to?.slice(0, 10) ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined }))}
                className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
            </div>
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Status</label>
              <select value={filter.status_id ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, status_id: e.target.value || undefined }))}
                className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]">
                <option value="">All statuses</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Project</label>
              <select value={filter.project_id ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, project_id: e.target.value || undefined }))}
                className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]">
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Source</label>
              <select value={filter.channel ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, channel: (e.target.value || undefined) as LeadChannel | undefined }))}
                className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]">
                <option value="">All sources</option>
                {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
              </select>
            </div>
            {hasFilters && (
              <div className="col-span-1 sm:col-span-2 md:col-span-4">
                <button onClick={() => setFilter({})} className="text-xs text-[#5757e6] hover:text-[#4444cc]">Reset filters</button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------- Datatable ---------- */}
      <section className="bg-white border border-[#e5e7eb] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-[#4B5563]">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] rounded-lg px-2 py-1 text-sm focus:outline-none">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end flex-wrap">
            <DensityToggle density={density} onChange={setDensity} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Project</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Note</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} cols={8} />
              ) : visible.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon="🗂️" title="No leads found" hint={hasFilters ? 'Try adjusting or resetting your filters.' : 'New leads assigned to you will show up here.'}
                    action={hasFilters ? { label: 'Reset filters', onClick: () => { setFilter({}); setSearch('') } } : undefined} />
                </td></tr>
              ) : visible.map((lead) => {
                const status = lead.status_id ? statusById[lead.status_id] : undefined
                const project = lead.project_id ? projectById[lead.project_id] : undefined
                return (
                  <tr key={lead.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                    <td className={`px-3 ${rowPad} text-[#4B5563] text-xs whitespace-nowrap`}>{fmtDate(lead.created_at)}</td>
                    <td className={`px-3 ${rowPad} text-[#5757e6] font-medium`}>{lead.name}</td>
                    <td className={`px-3 ${rowPad} text-[#4B5563] font-mono text-xs`}>{lead.phone}</td>
                    <td className={`px-3 ${rowPad}`}>
                      <Pill label={CHANNEL_LABELS[lead.channel]} color={CHANNEL_COLORS[lead.channel]} />
                    </td>
                    <td className={`px-3 ${rowPad}`}>
                      {project ? (
                        <span className="text-xs px-2 py-1 rounded bg-[#5757e6]/15 text-[#4444cc]">{project.name}</span>
                      ) : <span className="text-[#4B5563] text-xs">—</span>}
                    </td>
                    <td className={`px-3 ${rowPad}`}>
                      <select
                        value={lead.status_id ?? ''}
                        onChange={(e) => changeStatus(lead, e.target.value)}
                        className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg px-2 py-1 text-xs focus:outline-none"
                        style={{ color: status?.color ?? '#4B5563' }}
                      >
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id} style={{ color: '#111827', backgroundColor: '#fff' }}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`px-3 ${rowPad} text-xs text-[#4B5563]`}>{lead.expire_note ?? '—'}</td>
                    <td className={`px-3 ${rowPad} whitespace-nowrap`}>
                      <button onClick={() => setWorkFor(lead)}
                        className="text-xs font-medium text-white bg-[#5757e6] hover:bg-[#4444cc] rounded px-2.5 py-1 mr-2 transition-colors">Work</button>
                      <button onClick={() => setHistoryFor(lead)}
                        className="text-xs text-[#5757e6] hover:underline">History</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && visible.length > 0 && (
          <p className="text-xs text-[#6B7280] mt-3">Showing {visible.length} of {leads.length} entries</p>
        )}
      </section>

      {reminderFor && (
        <ReminderModal lead={reminderFor} current={CURRENT} onClose={() => setReminderFor(null)} />
      )}
      {historyFor && (
        <LeadHistoryDrawer lead={historyFor} currentUser={CURRENT} onClose={() => { setHistoryFor(null); reload() }} />
      )}
      {workFor && (
        <LeadWorkDrawer lead={workFor} currentUser={CURRENT}
          onChanged={() => { reload(); listLeads(scope).then(setAllLeads) }}
          onClose={() => setWorkFor(null)} />
      )}
    </div>
  )
}

function ReminderModal({ lead, current, onClose }: { lead: CrmLead; current: { id: string; name: string }; onClose: () => void }) {
  const [at, setAt] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const invalid = touched && !at
  async function save() {
    setTouched(true)
    if (!at) { toast.error('Pick a date & time'); return }
    setSaving(true)
    await scheduleReminder(current.id, lead.id, new Date(at).toISOString(), note)
    setSaving(false)
    toast.success('Reminder scheduled')
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-[#111827] mb-1">Schedule reminder</h3>
        <p className="text-xs text-[#6B7280] mb-4">Follow-up on {lead.name} · {lead.phone}</p>
        <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">When</label>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} onBlur={() => setTouched(true)}
          className={`w-full mt-1 mb-1 bg-[#f3f4f6] border text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${invalid ? 'border-[#F26161] focus:ring-[#F26161]' : 'border-[#e5e7eb] focus:ring-[#5757e6]'}`} />
        {invalid && <p className="text-[11px] text-[#F26161] mb-2">Pick a date and time to continue.</p>}
        <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Note</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Call back about villa pricing"
          className="w-full mt-1 mb-4 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
            {saving ? 'Saving…' : 'Schedule'}
          </button>
          <button onClick={onClose} className="px-4 text-sm text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  )
}
