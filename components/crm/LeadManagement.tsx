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
import PageHeader from './ui/PageHeader'
import SlideOver from './ui/SlideOver'
import { Pill } from './ui/Pill'
import { TableSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'
import { DensityToggle, useDensity } from './ui/useDensity'
import { CHANNELS, CHANNEL_LABELS, CHANNEL_COLORS, SALARY_BRACKETS, DOWN_PAYMENT_BRACKETS, VEHICLE_SOURCES } from '@/lib/crm/constants'
import { useSession } from '@/lib/crm/session'

const salaryLabel = (v: string | null) => SALARY_BRACKETS.find((x) => x.value === v)?.label ?? (v ?? '')
const downPaymentLabel = (v: string | null) => DOWN_PAYMENT_BRACKETS.find((x) => x.value === v)?.label ?? (v ?? '')
const carSourceLabel = (v: string | null) => VEHICLE_SOURCES.find((x) => x.value === v)?.label ?? (v ?? '')

const ACTOR = { id: 'u-admin', name: 'Mohamed Moheb' }

export default function LeadManagement() {
  const { user } = useSession()
  // Direct Sales supervisors work leads telesales already brought in — they don't import new ones.
  const canAddLeads = user.role !== 'direct_sales_supervisor'
  const { density, setDensity, rowPad } = useDensity()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [filter, setFilter] = useState<LeadFilter>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [historyFor, setHistoryFor] = useState<CrmLead | null>(null)

  async function reload() {
    const [l, s, p, u] = await Promise.all([
      listLeads({ ...filter, search: search || undefined }), listStatuses(), listProjects(), listUsers(),
    ])
    setLeads(l); setStatuses(s); setProjects(p); setUsers(u)
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [filter, search])

  const statusById = useMemo(() => Object.fromEntries(statuses.map((s) => [s.id, s])), [statuses])
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const agents = users.filter((u) => u.role.includes('agent'))
  const campaigns = useMemo(() => Array.from(new Set(leads.map((l) => l.campaign).filter(Boolean))) as string[], [leads])
  const hasFilters = Boolean(filter.status_id || filter.project_id || filter.assigned_user_id || filter.channel || filter.campaign || filter.from || filter.to || search)

  function exportCsv() {
    const rows = leads.map((l) => ({
      'Entry ID': l.entry_id,
      'Entry Date': new Date(l.created_at).toLocaleDateString('en-CA'),
      'Entry Time': new Date(l.created_at).toLocaleString(),
      Name: l.name, Phone: l.phone,
      Source: CHANNEL_LABELS[l.channel],
      Campaign: l.campaign ?? '',
      Project: projectById[l.project_id ?? '']?.name ?? '',
      Status: statusById[l.status_id ?? '']?.name ?? '',
      Stage: l.stage,
      Assigned: users.find((u) => u.id === l.assigned_user_id)?.full_name ?? '',
      NationalID: l.customer_national_id ?? '',
      // ---- Telesales KYC / qualify ----
      'TS: Occupation': l.occupation ?? '',
      'TS: Salary Bracket': salaryLabel(l.salary_bracket),
      'TS: Down Payment Bracket': downPaymentLabel(l.down_payment_bracket),
      'TS: Financing Program': l.financing_program ?? '',
      'TS: Car Source': carSourceLabel(l.car_source),
      'TS: Knows Specific Car': l.knows_specific_car === null ? '' : l.knows_specific_car ? 'Yes' : 'No',
      'TS: Requested Brand': l.requested_car_brand ?? '',
      'TS: Requested Model': l.requested_car_model ?? '',
      'TS: Requested Year': l.requested_car_year ?? '',
      'TS: Disposition': l.tele_disposition ?? '',
      'TS: Qualified At': l.telesales_qualified_at ? new Date(l.telesales_qualified_at).toLocaleString() : '',
      // ---- Direct Sales KYC / qualify ----
      'DS: Expected Program': l.expected_program ?? '',
      'DS: ID Document': l.id_document_url ? 'Uploaded' : '',
      'DS: Assigned At': l.direct_sales_assigned_at ? new Date(l.direct_sales_assigned_at).toLocaleString() : '',
      'DS: Disposition': l.ds_disposition ?? '',
      'DS: Unqualification Reason': l.unqualification_reason ?? '',
    }))
    const csv = Papa.unparse(rows)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `leads-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        crumbs={[{ label: 'CRM', href: '/crm' }]}
        title="Lead Management"
        subtitle={`${leads.length} leads`}
        action={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="border border-[#e5e7eb] text-[#4B5563] hover:text-[#111827] hover:bg-[#f3f4f6] text-sm rounded-lg px-4 py-2 transition-colors">⬇ Export CSV</button>
            {canAddLeads && (
              <button onClick={() => setAdding(true)} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">+ Add Leads</button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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
        <select value={filter.channel ?? ''} onChange={(e) => setFilter((f) => ({ ...f, channel: (e.target.value || undefined) as typeof f.channel }))} className={sel}>
          <option value="">All sources</option>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
        </select>
        <select value={filter.campaign ?? ''} onChange={(e) => setFilter((f) => ({ ...f, campaign: e.target.value || undefined }))} className={sel}>
          <option value="">All campaigns</option>{campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entry ID, name or phone…" className={`${sel} sm:col-span-2 md:col-span-3`} />
        {hasFilters && (
          <button onClick={() => { setFilter({}); setSearch('') }} className="text-xs text-[#5757e6] hover:text-[#4444cc] self-center">Reset</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="flex justify-end px-4 pt-3">
          <DensityToggle density={density} onChange={setDensity} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Entry ID</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Project</th><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">History</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} cols={10} />
              ) : leads.length === 0 ? (
                <tr><td colSpan={10}>
                  <EmptyState icon="❄️" title="No leads found"
                    hint={hasFilters ? 'Try adjusting or resetting your filters.' : canAddLeads ? 'Add leads manually or import a CSV to get started.' : 'Leads will appear here once telesales brings them in.'}
                    action={hasFilters ? { label: 'Reset filters', onClick: () => { setFilter({}); setSearch('') } } : canAddLeads ? { label: '+ Add Leads', onClick: () => setAdding(true) } : undefined} />
                </td></tr>
              ) : leads.map((l) => {
                const status = l.status_id ? statusById[l.status_id] : undefined
                return (
                  <tr key={l.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                    <td className={`px-4 ${rowPad} text-[#6B7280] font-mono text-xs whitespace-nowrap`}>{l.entry_id}</td>
                    <td className={`px-4 ${rowPad} text-[#4B5563] text-xs whitespace-nowrap`}>{new Date(l.created_at).toLocaleDateString('en-CA')}</td>
                    <td className={`px-4 ${rowPad} text-[#111827]`}>{l.name}</td>
                    <td className={`px-4 ${rowPad} text-[#4B5563] font-mono text-xs`}>{l.phone}</td>
                    <td className={`px-4 ${rowPad}`}><Pill label={CHANNEL_LABELS[l.channel]} color={CHANNEL_COLORS[l.channel]} /></td>
                    <td className={`px-4 ${rowPad} text-xs text-[#4B5563]`}>{projectById[l.project_id ?? '']?.name ?? '—'}</td>
                    <td className={`px-4 ${rowPad} text-xs text-[#4B5563]`}>{l.campaign ?? '—'}</td>
                    <td className={`px-4 ${rowPad}`}>
                      <select value={l.status_id ?? ''} onChange={async (e) => { await updateLeadStatus(l.id, e.target.value, ACTOR.name); reload() }}
                        className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg px-2 py-1 text-xs focus:outline-none" style={{ color: status?.color ?? '#4B5563' }}>
                        {statuses.map((s) => <option key={s.id} value={s.id} style={{ color: '#111827', backgroundColor: '#fff' }}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className={`px-4 ${rowPad}`}>
                      <select value={l.assigned_user_id ?? ''} onChange={async (e) => { await assignLead(l.id, e.target.value || null, ACTOR.name); reload() }}
                        className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] rounded-lg px-2 py-1 text-xs focus:outline-none">
                        <option value="">Unassigned</option>
                        {agents.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                      </select>
                    </td>
                    <td className={`px-4 ${rowPad}`}><button onClick={() => setHistoryFor(l)} className="text-xs text-[#5757e6] hover:underline">View</button></td>
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
  const [channel, setChannel] = useState<LeadChannel>('call_center')
  const [campaign, setCampaign] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [importCount, setImportCount] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const defaultStatus = statuses.find((s) => s.is_default)?.id ?? statuses[0]?.id ?? null

  const nameError = touched && !name.trim() ? 'Name is required' : null
  const phoneError = touched && !phone.trim() ? 'Phone is required' : touched && phone.trim() && !/^\d{8,}$/.test(phone.replace(/\D/g, '')) ? 'Enter a valid phone number' : null

  async function saveManual() {
    setTouched(true)
    if (!name.trim() || !phone.trim() || phoneError) { toast.error('Fix the highlighted fields'); return }
    setSaving(true)
    await createLead({ name: name.trim(), phone: phone.trim(), channel, campaign: campaign.trim() || null, project_id: projectId || null, status_id: defaultStatus, assigned_user_id: null, expire_note: null })
    setSaving(false)
    toast.success('Lead added')
    onDone()
  }

  function downloadTemplate() {
    const csv = Papa.unparse({
      // National ID is intentionally excluded — telesales collects it during KYC, not at import time.
      // Project must match an existing project's name exactly (case-insensitive); leave blank for none.
      fields: ['name', 'phone', 'source', 'campaign', 'project'],
      data: [
        ['Ahmed Mostafa', '01012345678', 'call_center', 'Summer 2025', 'Alexandria'],
        ['Mona Ibrahim', '01198765432', 'facebook', 'Ramadan Offer', 'Palmhills (Alexandria)'],
      ],
    })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'lead-import-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const rows = (res.data as Record<string, string>[])
          .map((r) => {
            const rawCh = (r.source || r.Source || r.channel || r.Channel || '').toLowerCase().replace(/[\s-]/g, '_')
            const ch = (CHANNELS as string[]).includes(rawCh) ? (rawCh as LeadChannel) : 'call_center'
            const rawProject = (r.project || r.Project || '').trim().toLowerCase()
            const matchedProject = rawProject ? projects.find((p) => p.name.trim().toLowerCase() === rawProject) : undefined
            return {
              name: r.name || r.Name || '', phone: r.phone || r.Phone || r.mobile || '',
              channel: ch, campaign: r.campaign || r.Campaign || null,
              project_id: matchedProject?.id ?? null,
              status_id: defaultStatus, assigned_user_id: null, expire_note: null,
            }
          })
          .filter((r) => r.name && r.phone)
        if (rows.length === 0) { toast.error('No valid rows (need name + phone columns)'); return }
        const n = await importLeads(rows)
        setImportCount(n)
        toast.success(`Imported ${n} leads`)
        setTimeout(onDone, 400)
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }

  return (
    <SlideOver title="Add Leads" onClose={onClose}>
      <div className="flex gap-1 mb-4 border-b border-[#e5e7eb]">
        {(['manual', 'import'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${mode === m ? 'text-[#5757e6] border-[#5757e6]' : 'text-[#6B7280] border-transparent hover:text-[#111827]'}`}>{m}</button>
        ))}
      </div>

      {mode === 'manual' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={sel}>
                <option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Source</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as LeadChannel)} className={sel}>
                {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} className={errCls(sel, !!nameError)} />
            {nameError && <p className={errText}>{nameError}</p>}
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setTouched(true)} className={errCls(sel, !!phoneError)} placeholder="01xxxxxxxxx" />
            {phoneError && <p className={errText}>{phoneError}</p>}
          </div>
          <div><label className={lbl}>Campaign (optional)</label><input value={campaign} onChange={(e) => setCampaign(e.target.value)} className={sel} placeholder="e.g. Summer 2025" /></div>
          <button onClick={saveManual} disabled={saving} className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">{saving ? 'Saving…' : 'Add Lead'}</button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-[#4B5563] mb-1">Upload a CSV with <span className="text-[#111827] font-mono">name, phone</span> columns (optional <span className="font-mono">source, campaign, project</span>). Each row&apos;s own source, campaign and project are used — nothing is picked in this panel.</p>
          <p className="text-[11px] text-[#6B7280] mb-1">Valid <span className="font-mono">source</span> values: <span className="font-mono">{CHANNELS.join(', ')}</span></p>
          <p className="text-[11px] text-[#6B7280] mb-3"><span className="font-mono">project</span> must match an existing project&apos;s name exactly (case-insensitive); leave blank for none. National ID is collected by telesales during KYC, not at import.</p>

          <button onClick={downloadTemplate} type="button"
            className="w-full mb-3 flex items-center justify-center gap-2 border border-[#5757e6]/30 bg-[#5757e6]/5 hover:bg-[#5757e6]/10 text-[#5757e6] text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">
            ⬇ Download Template
          </button>

          <input ref={fileRef} type="file" accept=".csv" onChange={onFile}
            className="block w-full text-xs text-[#4B5563] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#5757e6] file:text-white file:text-sm file:cursor-pointer" />
          {importCount !== null && <p className="text-xs text-[#22C55E] mt-3">✓ Imported {importCount} leads</p>}
        </div>
      )}
    </SlideOver>
  )
}

function errCls(base: string, hasError: boolean) {
  return hasError ? base.replace('border-[#e5e7eb]', 'border-[#F26161]').replace('focus:ring-[#5757e6]', 'focus:ring-[#F26161]') : base
}

const sel = 'w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
const lbl = 'text-[10px] text-[#6B7280] uppercase tracking-wide'
const errText = 'text-[11px] text-[#F26161] mt-1'
