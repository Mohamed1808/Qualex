'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, CallAttempt, CallStage, Disposition, AnsweredCategory, Project } from '@/lib/crm/types'
import {
  listCallAttempts, logCallAttempt, qualifyLead, setDisposition, updateLead,
  scheduleReminder, listProjects, type QualificationInput,
} from '@/lib/crm/service'
import {
  ANSWERED_CATEGORIES, EXPECTED_PROGRAMS, VEHICLE_SOURCES, SALARY_BRACKETS,
  DOWN_PAYMENT_BRACKETS, CHANNEL_LABELS,
} from '@/lib/crm/constants'

const TELE_STAGES = ['new', 'telesales_assigned', 'telesales_in_progress']
const DS_STAGES = ['ds_assigned', 'ds_in_progress', 'id_collected']
const OUTCOME_COLOR: Record<string, string> = { answered: '#22C55E', no_answer: '#F26161', callback_scheduled: '#F59E0B' }

type TabKey = 'kyc' | 'qualify'

export default function LeadWorkDrawer({
  lead, currentUser, onClose, onChanged,
}: {
  lead: CrmLead
  currentUser: { id: string; name: string; role: string }
  onClose: () => void
  onChanged: () => void
}) {
  const isTelesales = currentUser.role.startsWith('telesales')
  const isDS = currentUser.role.startsWith('direct_sales')
  const callStage: CallStage = isDS || DS_STAGES.includes(lead.stage) || lead.stage === 'credit_submitted' ? 'direct_sales' : 'telesales'
  const canQualify = isTelesales && TELE_STAGES.includes(lead.stage)

  const tabs: { key: TabKey; label: string; icon: string }[] = isTelesales
    ? [{ key: 'kyc', label: 'KYC', icon: '🪪' }, { key: 'qualify', label: 'Qualify', icon: '✅' }]
    : [{ key: 'kyc', label: 'KYC', icon: '🪪' }]
  const [tab, setTab] = useState<TabKey>('kyc')

  const [projects, setProjects] = useState<Project[]>([])
  const [attempts, setAttempts] = useState<CallAttempt[]>([])
  async function reloadAttempts() { setAttempts(await listCallAttempts(lead.id, callStage)) }
  useEffect(() => { reloadAttempts(); listProjects().then(setProjects) /* eslint-disable-next-line */ }, [lead.id])
  const projectName = projects.find((p) => p.id === lead.project_id)?.name ?? '—'

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white border-l border-[#e5e7eb] w-full max-w-lg h-full flex flex-col shadow-2xl animate-[slideIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-start justify-between flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#111827] truncate">{lead.name}</h3>
            <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#5757e6]/15 text-[#4444cc] capitalize">
              {lead.stage.replace(/_/g, ' ')}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#6B7280] hover:text-[#111827] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] transition-colors flex-shrink-0">✕</button>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex border-b border-[#e5e7eb] flex-shrink-0">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.key ? 'text-[#5757e6] border-[#5757e6]' : 'text-[#6B7280] border-transparent hover:text-[#111827]'
                }`}>
                <span className="mr-1">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
          {tab === 'kyc' && (
            <>
              {isTelesales ? (
                <TelesalesKyc lead={lead} channelLabel={CHANNEL_LABELS[lead.channel]} projectName={projectName} currentUser={currentUser} onChanged={onChanged} />
              ) : (
                <DirectSalesKyc lead={lead} channelLabel={CHANNEL_LABELS[lead.channel]} projectName={projectName} currentUser={currentUser} onChanged={onChanged} onClose={onClose} />
              )}

              <AutoCallbackNote lead={lead} />

              <CallAttemptsPanel lead={lead} stage={callStage} attempts={attempts} currentUser={currentUser}
                onLogged={() => { reloadAttempts(); onChanged() }} />

              <ReminderPanel lead={lead} currentUser={currentUser} />

              {/* DS: dispositions live in KYC */}
              {isDS && <DispositionPanel lead={lead} stage={callStage} currentUser={currentUser} onDone={() => { onChanged(); onClose() }} />}
            </>
          )}

          {tab === 'qualify' && canQualify && (
            <>
              <QualifyPanel lead={lead} currentUser={currentUser} onDone={() => { onChanged(); onClose() }} />
              {/* Telesales: dispositions live in Qualify */}
              <DispositionPanel lead={lead} stage={callStage} currentUser={currentUser} onDone={() => { onChanged(); onClose() }} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-[#4B5563] uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <p className="mt-1 text-sm text-[#111827] bg-[#f3f4f6] rounded-lg px-3 py-2 border border-[#e5e7eb]">{value || '—'}</p>
    </div>
  )
}

// ---------------- Telesales KYC (identity, editable name/phone/national id) ----------------
function TelesalesKyc({ lead, channelLabel, projectName, currentUser, onChanged }: {
  lead: CrmLead; channelLabel: string; projectName: string; currentUser: { id: string; name: string }; onChanged: () => void
}) {
  const [name, setName] = useState(lead.name)
  const [phone, setPhone] = useState(lead.phone)
  const [nid, setNid] = useState(lead.customer_national_id ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = name !== lead.name || phone !== lead.phone || nid !== (lead.customer_national_id ?? '')

  async function save() {
    if (!name.trim() || !phone.trim()) { toast.error('Name and phone are required'); return }
    setSaving(true)
    await updateLead(lead.id, { name: name.trim(), phone: phone.trim(), customer_national_id: nid.trim() || null }, currentUser.name, 'KYC updated', currentUser.id)
    setSaving(false)
    toast.success('KYC saved')
    onChanged()
  }

  return (
    <Section title="Customer KYC">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>National ID</label>
          <input value={nid} onChange={(e) => setNid(e.target.value)} placeholder="14-digit national ID" className={inp} />
        </div>
        <ReadonlyField label="Channel" value={channelLabel} />
        <ReadonlyField label="Project" value={projectName} />
        {lead.campaign && <ReadonlyField label="Campaign" value={lead.campaign} />}
      </div>
      {dirty && (
        <button onClick={save} disabled={saving} className="mt-3 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">
          {saving ? 'Saving…' : 'Save KYC'}
        </button>
      )}
    </Section>
  )
}

// ---------------- Direct Sales KYC (fetched + vehicle/program + ID + credit) ----------------
function DirectSalesKyc({ lead, channelLabel, projectName, currentUser, onChanged, onClose }: {
  lead: CrmLead; channelLabel: string; projectName: string; currentUser: { id: string; name: string }; onChanged: () => void; onClose: () => void
}) {
  const [downPayment, setDownPayment] = useState(lead.down_payment_bracket ?? '')
  const [brand, setBrand] = useState(lead.requested_car_brand ?? '')
  const [model, setModel] = useState(lead.requested_car_model ?? '')
  const [year, setYear] = useState<string>(lead.requested_car_year ? String(lead.requested_car_year) : '')
  const [source, setSource] = useState(lead.car_source ?? 'dealer')
  const [program, setProgram] = useState(lead.expected_program ?? '')
  const [docUrl, setDocUrl] = useState(lead.id_document_url ?? '')
  const [savingKyc, setSavingKyc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = DS_STAGES.includes(lead.stage)

  async function saveKyc() {
    setSavingKyc(true)
    await updateLead(lead.id, {
      down_payment_bracket: downPayment || null,
      requested_car_brand: brand.trim() || null,
      requested_car_model: model.trim() || null,
      requested_car_year: year ? Number(year) : null,
      car_source: (source || 'dealer') as CrmLead['car_source'],
      expected_program: (program || null) as CrmLead['expected_program'],
      id_document_url: docUrl.trim() || null,
    }, currentUser.name, 'Direct Sales KYC updated', currentUser.id)
    setSavingKyc(false)
    toast.success('KYC saved')
    onChanged()
  }

  async function submitCredit() {
    if (!docUrl.trim()) { toast.error('Upload / attach the ID document first'); return }
    setSubmitting(true)
    await updateLead(lead.id, {
      down_payment_bracket: downPayment || null, requested_car_brand: brand.trim() || null,
      requested_car_model: model.trim() || null, requested_car_year: year ? Number(year) : null,
      car_source: (source || 'dealer') as CrmLead['car_source'], expected_program: (program || null) as CrmLead['expected_program'],
      id_document_url: docUrl.trim(), stage: 'credit_submitted',
    }, currentUser.name, 'Documents collected → submitted to Credit', currentUser.id)
    setSubmitting(false)
    toast.success('Submitted to Credit')
    onChanged(); onClose()
  }

  return (
    <>
      <Section title="Customer (from Telesales)">
        <div className="grid grid-cols-2 gap-3">
          <ReadonlyField label="Name" value={lead.name} />
          <ReadonlyField label="Phone" value={lead.phone} />
          <ReadonlyField label="National ID" value={lead.customer_national_id ?? '—'} />
          <ReadonlyField label="Channel" value={channelLabel} />
          <ReadonlyField label="Project" value={projectName} />
          <ReadonlyField label="Occupation" value={lead.occupation ?? '—'} />
          <ReadonlyField label="Salary" value={SALARY_BRACKETS.find((b) => b.value === lead.salary_bracket)?.label ?? '—'} />
          <ReadonlyField label="Financing" value={lead.financing_program?.replace('_', ' ') ?? '—'} />
        </div>
      </Section>

      <Section title="Deal Details">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Final down payment</label>
            <select value={downPayment} onChange={(e) => setDownPayment(e.target.value)} className={inp}>
              <option value="">Select…</option>
              {DOWN_PAYMENT_BRACKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Expected program</label>
            <select value={program} onChange={(e) => setProgram(e.target.value)} className={inp}>
              <option value="">Select…</option>
              {EXPECTED_PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Car brand</label><input value={brand} onChange={(e) => setBrand(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Car model</label><input value={model} onChange={(e) => setModel(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Manufacture year</label><input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inp} /></div>
          <div>
            <label className={lbl}>Vehicle source</label>
            <select value={source ?? 'dealer'} onChange={(e) => setSource(e.target.value as NonNullable<CrmLead['car_source']>)} className={inp}>
              {VEHICLE_SOURCES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <button onClick={saveKyc} disabled={savingKyc} className="mt-3 border border-[#e5e7eb] text-[#4B5563] hover:text-[#111827] hover:bg-[#f3f4f6] text-sm rounded-lg px-4 py-2 transition-colors">
          {savingKyc ? 'Saving…' : 'Save details'}
        </button>
      </Section>

      <Section title="ID Document">
        <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="ID document URL (upload link)" className={inp} />
        <p className="text-[10px] text-[#6B7280] mt-1">File upload is stubbed for the frontend — paste a link. Backend wires real storage.</p>
        {canSubmit && (
          <button onClick={submitCredit} disabled={submitting} className="mt-3 w-full bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-2.5 transition-colors">
            {submitting ? 'Submitting…' : '🏦 Submit to Credit'}
          </button>
        )}
      </Section>
    </>
  )
}

function AutoCallbackNote({ lead }: { lead: CrmLead }) {
  if (!lead.next_callback_at) return null
  const when = new Date(lead.next_callback_at)
  return (
    <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg px-3 py-2">
      <p className="text-xs text-[#B45309] font-medium">
        📞 Auto-scheduled callback: {when.toLocaleString()}
      </p>
      {lead.callback_locked && <p className="text-[10px] text-[#92400E] mt-0.5">System-set after a no-answer — not editable.</p>}
    </div>
  )
}

function CallAttemptsPanel({ lead, stage, attempts, currentUser, onLogged }: {
  lead: CrmLead; stage: CallStage; attempts: CallAttempt[]
  currentUser: { id: string; name: string }; onLogged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<'answered' | 'no_answer'>('answered')
  const [category, setCategory] = useState<AnsweredCategory>('inquiry_only')
  const [callbackAt, setCallbackAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const ordered = useMemo(() => [...attempts].sort((a, b) => a.attempt_number - b.attempt_number), [attempts])
  let streak = 0
  for (let i = ordered.length - 1; i >= 0; i--) { if (ordered[i].outcome === 'no_answer') streak++; else break }
  const locked = lead.stage === 'terminated' || lead.stage === 'unreachable'
  const needsCallbackTime = outcome === 'answered' && category === 'specific_call_back_time'
  const callbackError = touched && needsCallbackTime && !callbackAt ? 'Pick the requested callback date & time' : null

  async function save() {
    setTouched(true)
    if (needsCallbackTime && !callbackAt) return
    setSaving(true)
    const res = await logCallAttempt(
      lead.id, stage, outcome,
      needsCallbackTime && callbackAt ? new Date(callbackAt).toISOString() : null,
      notes || null, currentUser.id, currentUser.name,
      outcome === 'answered' ? category : null,
    )
    setSaving(false)
    if (!res.ok) { toast.error(res.error ?? 'Failed'); onLogged(); return }
    toast.success('Attempt logged')
    if (res.autoCallbackAt) toast.info(`Callback auto-scheduled for ${new Date(res.autoCallbackAt).toLocaleString()}`)
    setOpen(false); setNotes(''); setCallbackAt(''); setOutcome('answered'); setCategory('inquiry_only'); setTouched(false)
    onLogged()
  }

  return (
    <Section title={`Call Attempts (${attempts.length}${streak > 0 ? ` · ${streak}/3 no-answer` : ''})`}>
      <div className="space-y-2">
        {ordered.map((a) => (
          <div key={a.id} className="bg-[#f3f4f6] rounded-lg p-2.5 flex items-center gap-2 flex-wrap">
            <span className="w-5 h-5 rounded-full bg-[#e5e7eb] text-[#111827] text-[10px] flex items-center justify-center flex-shrink-0">{a.attempt_number}</span>
            <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ color: OUTCOME_COLOR[a.outcome], backgroundColor: `${OUTCOME_COLOR[a.outcome]}15` }}>{a.outcome.replace('_', ' ')}</span>
            {a.answered_category && <span className="text-[10px] text-[#4B5563] bg-white border border-[#e5e7eb] rounded px-1.5 py-0.5">{a.answered_category.replace(/_/g, ' ')}</span>}
            {a.notes && <span className="text-xs text-[#4B5563] truncate">{a.notes}</span>}
          </div>
        ))}
        {locked ? (
          <p className="text-xs text-[#F26161] bg-[#F26161]/10 rounded-lg px-3 py-2">
            {lead.stage === 'terminated' ? 'Auto-terminated after 3 no-answers.' : 'Closed as unreachable.'}
          </p>
        ) : open ? (
          <div className="bg-[#f3f4f6] rounded-lg p-3 space-y-2">
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className={inp}>
              <option value="answered">Answered</option>
              <option value="no_answer">No Answer</option>
            </select>
            {outcome === 'answered' && (
              <select value={category} onChange={(e) => setCategory(e.target.value as AnsweredCategory)} className={inp}>
                {ANSWERED_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            )}
            {needsCallbackTime && (
              <div>
                <input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} className={errCls(inp, !!callbackError)} />
                {callbackError && <p className="text-[11px] text-[#F26161] mt-1">{callbackError}</p>}
              </div>
            )}
            {outcome === 'no_answer' && (
              <p className="text-[10px] text-[#6B7280]">A callback will be auto-scheduled ({streak === 0 ? '30 min' : streak === 1 ? '1 hour' : '24 hours'}).</p>
            )}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes…" className={inp} />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm rounded-lg py-2 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => { setOpen(false); setTouched(false) }} className="px-3 text-sm text-[#6B7280] hover:text-[#111827]">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setOpen(true)} className="w-full text-sm text-[#5757e6] border border-[#5757e6]/30 bg-[#5757e6]/5 hover:bg-[#5757e6]/10 rounded-lg px-3 py-2 transition-colors">+ Log call attempt</button>
        )}
      </div>
    </Section>
  )
}

function QualifyPanel({ lead, currentUser, onDone }: { lead: CrmLead; currentUser: { id: string; name: string }; onDone: () => void }) {
  const [f, setF] = useState<QualificationInput>({
    salary_bracket: lead.salary_bracket ?? '', down_payment_bracket: lead.down_payment_bracket ?? '',
    financing_program: lead.financing_program ?? 'new_car', car_source: lead.car_source ?? 'dealer',
    occupation: lead.occupation ?? '', customer_national_id: lead.customer_national_id ?? '',
    requested_car_brand: lead.requested_car_brand ?? '', requested_car_model: lead.requested_car_model ?? '', requested_car_year: lead.requested_car_year ?? undefined,
  })
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const salaryError = touched && !f.salary_bracket ? 'Required' : null
  const downError = touched && !f.down_payment_bracket ? 'Required' : null
  const occError = touched && !f.occupation ? 'Required' : null

  async function qualify() {
    setTouched(true)
    if (!f.salary_bracket || !f.down_payment_bracket || !f.occupation) { toast.error('Fill salary, down payment, occupation'); return }
    setSaving(true)
    await qualifyLead(lead.id, f, currentUser.name, currentUser.id)
    setSaving(false)
    toast.success('Qualified — sent to Direct Sales')
    onDone()
  }
  const set = (k: keyof QualificationInput, v: unknown) => setF((s) => ({ ...s, [k]: v }))
  return (
    <Section title="Qualification">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <select value={f.salary_bracket} onChange={(e) => set('salary_bracket', e.target.value)} className={errCls(inp, !!salaryError)}>
            <option value="">Salary…</option>{SALARY_BRACKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          {salaryError && <p className="text-[11px] text-[#F26161] mt-1">{salaryError}</p>}
        </div>
        <div>
          <select value={f.down_payment_bracket} onChange={(e) => set('down_payment_bracket', e.target.value)} className={errCls(inp, !!downError)}>
            <option value="">Down payment…</option>{DOWN_PAYMENT_BRACKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          {downError && <p className="text-[11px] text-[#F26161] mt-1">{downError}</p>}
        </div>
        <select value={f.financing_program ?? 'new_car'} onChange={(e) => set('financing_program', e.target.value)} className={inp}>
          <option value="new_car">New Car</option><option value="used_car">Used Car</option><option value="collateral">Collateral</option>
        </select>
        <select value={f.car_source ?? 'dealer'} onChange={(e) => set('car_source', e.target.value)} className={inp}>
          {VEHICLE_SOURCES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        <div className="col-span-2">
          <input value={f.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="Occupation" className={errCls(inp, !!occError)} />
          {occError && <p className="text-[11px] text-[#F26161] mt-1">{occError}</p>}
        </div>
        <input value={f.requested_car_brand} onChange={(e) => set('requested_car_brand', e.target.value)} placeholder="Car brand" className={inp} />
        <input value={f.requested_car_model} onChange={(e) => set('requested_car_model', e.target.value)} placeholder="Car model" className={inp} />
        <input type="number" value={f.requested_car_year ?? ''} onChange={(e) => set('requested_car_year', e.target.value ? Number(e.target.value) : undefined)} placeholder="Year" className={inp} />
      </div>
      <button onClick={qualify} disabled={saving} className="mt-3 w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-black font-semibold text-sm rounded-lg py-2.5 transition-colors">
        {saving ? 'Qualifying…' : '✅ Qualify & Send to Direct Sales'}
      </button>
    </Section>
  )
}

function DispositionPanel({ lead, stage, currentUser, onDone }: { lead: CrmLead; stage: CallStage; currentUser: { id: string; name: string }; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  async function dispose(d: Disposition) {
    const note = d === 'unqualified' ? (window.prompt('Reason?') ?? '') : ''
    setBusy(true)
    await setDisposition(lead.id, stage, d, note, currentUser.name, currentUser.id)
    setBusy(false)
    toast.success(`Marked ${d}`)
    onDone()
  }
  return (
    <Section title="Actions">
      <div className="flex flex-wrap gap-2">
        {(['unqualified', 'no_answer', 'retired', 'terminated'] as Disposition[]).map((d) => (
          <button key={d} disabled={busy} onClick={() => dispose(d)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-[#4B5563] hover:text-[#111827] hover:border-[#d1d5db] capitalize disabled:opacity-50 transition-colors">
            {d.replace('_', ' ')}
          </button>
        ))}
      </div>
    </Section>
  )
}

function ReminderPanel({ lead, currentUser }: { lead: CrmLead; currentUser: { id: string } }) {
  const [at, setAt] = useState('')
  const [touched, setTouched] = useState(false)
  const atError = touched && !at ? 'Pick a time' : null
  async function save() {
    setTouched(true)
    if (!at) { toast.error('Pick a time'); return }
    await scheduleReminder(currentUser.id, lead.id, new Date(at).toISOString(), '')
    toast.success('Reminder scheduled'); setAt(''); setTouched(false)
  }
  return (
    <Section title="Self reminder">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={errCls(inp, !!atError)} />
          {atError && <p className="text-[11px] text-[#F26161] mt-1">{atError}</p>}
        </div>
        <button onClick={save} aria-label="Schedule reminder" className="px-3 py-2 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#B45309] text-sm rounded-lg transition-colors">🔔</button>
      </div>
    </Section>
  )
}

function errCls(base: string, hasError: boolean) {
  return hasError ? base.replace('border-[#e5e7eb]', 'border-[#F26161]').replace('focus:ring-[#5757e6]', 'focus:ring-[#F26161]') : base
}

const inp = 'w-full bg-[#f7f8fa] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
const lbl = 'text-[10px] text-[#6B7280] uppercase tracking-wide'
