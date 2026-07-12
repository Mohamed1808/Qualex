'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, CallAttempt, CallStage, Disposition } from '@/lib/crm/types'
import {
  listCallAttempts, logCallAttempt, qualifyLead, setDisposition, updateLead,
  scheduleReminder, type QualificationInput,
} from '@/lib/crm/service'
import IconAction from './ui/IconAction'

const TELE_STAGES = ['new', 'telesales_assigned', 'telesales_in_progress']
const DS_STAGES = ['ds_assigned', 'ds_in_progress', 'id_collected']

const OUTCOME_COLOR: Record<string, string> = { answered: '#22C55E', no_answer: '#F26161', callback_scheduled: '#F59E0B' }

type TabKey = 'details' | 'qualify' | 'credit' | 'actions'

export default function LeadWorkDrawer({
  lead, currentUser, onClose, onChanged,
}: {
  lead: CrmLead
  currentUser: { id: string; name: string; role: string }
  onClose: () => void
  onChanged: () => void
}) {
  const callStage: CallStage = DS_STAGES.includes(lead.stage) || lead.stage === 'credit_submitted' ? 'direct_sales' : 'telesales'
  const isTelesales = currentUser.role.startsWith('telesales')
  const isDS = currentUser.role.startsWith('direct_sales')
  const canQualify = isTelesales && TELE_STAGES.includes(lead.stage)
  const canCredit = isDS && DS_STAGES.includes(lead.stage)

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'details', label: 'Details', icon: '📋' },
    ...(canQualify ? [{ key: 'qualify' as const, label: 'Qualify', icon: '✅' }] : []),
    ...(canCredit ? [{ key: 'credit' as const, label: 'Credit', icon: '🏦' }] : []),
    { key: 'actions', label: 'Actions', icon: '⚙️' },
  ]
  const [tab, setTab] = useState<TabKey>('details')

  const [attempts, setAttempts] = useState<CallAttempt[]>([])
  async function reloadAttempts() { setAttempts(await listCallAttempts(lead.id, callStage)) }
  useEffect(() => { reloadAttempts() /* eslint-disable-next-line */ }, [lead.id])

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
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <IconAction label="Call" href={`tel:${lead.phone}`} bg="#5757e6">☎</IconAction>
            <IconAction label="WhatsApp" href={`https://wa.me/${lead.phone.replace(/\D/g, '').replace(/^0/, '20')}`} target="_blank" rel="noopener noreferrer" bg="#25D366">✆</IconAction>
            <button onClick={onClose} aria-label="Close" className="text-[#6B7280] hover:text-[#111827] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] ml-1 transition-colors">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e5e7eb] flex-shrink-0 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 min-w-fit px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key ? 'text-[#5757e6] border-[#5757e6]' : 'text-[#6B7280] border-transparent hover:text-[#111827]'
              }`}>
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
          {tab === 'details' && (
            <>
              <CallAttemptsPanel lead={lead} stage={callStage} attempts={attempts} currentUser={currentUser}
                onLogged={() => { reloadAttempts(); onChanged() }} />
              <ReminderPanel lead={lead} currentUser={currentUser} />
            </>
          )}
          {tab === 'qualify' && canQualify && (
            <QualifyPanel lead={lead} currentUser={currentUser} onDone={() => { onChanged(); onClose() }} />
          )}
          {tab === 'credit' && canCredit && (
            <CreditSubmitPanel lead={lead} currentUser={currentUser} onDone={() => { onChanged(); onClose() }} />
          )}
          {tab === 'actions' && (
            <DispositionPanel lead={lead} stage={callStage} currentUser={currentUser} onDone={() => { onChanged(); onClose() }} />
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

function CallAttemptsPanel({ lead, stage, attempts, currentUser, onLogged }: {
  lead: CrmLead; stage: CallStage; attempts: CallAttempt[]
  currentUser: { id: string; name: string }; onLogged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<'answered' | 'no_answer' | 'callback_scheduled'>('answered')
  const [callbackAt, setCallbackAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const ordered = [...attempts].sort((a, b) => a.attempt_number - b.attempt_number)
  let streak = 0
  for (let i = ordered.length - 1; i >= 0; i--) { if (ordered[i].outcome === 'no_answer') streak++; else break }
  const locked = streak >= 3
  const callbackError = touched && outcome === 'callback_scheduled' && !callbackAt ? 'Pick a callback date & time' : null

  async function save() {
    setTouched(true)
    if (outcome === 'callback_scheduled' && !callbackAt) return
    setSaving(true)
    const res = await logCallAttempt(lead.id, stage, outcome, outcome === 'callback_scheduled' && callbackAt ? new Date(callbackAt).toISOString() : null, notes || null, currentUser.id, currentUser.name)
    setSaving(false)
    if (!res.ok) { toast.error(res.error ?? 'Failed'); return }
    toast.success('Attempt logged')
    if (res.unreachable) toast.warning('Customer marked unreachable after 3 no-answers')
    setOpen(false); setNotes(''); setCallbackAt(''); setOutcome('answered'); setTouched(false)
    onLogged()
  }

  return (
    <Section title={`Call Attempts (${attempts.length}${streak > 0 ? ` · ${streak}/3 no-answer` : ''})`}>
      <div className="space-y-2">
        {ordered.map((a) => (
          <div key={a.id} className="bg-[#f3f4f6] rounded-lg p-2.5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#e5e7eb] text-[#111827] text-[10px] flex items-center justify-center flex-shrink-0">{a.attempt_number}</span>
            <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ color: OUTCOME_COLOR[a.outcome], backgroundColor: `${OUTCOME_COLOR[a.outcome]}15` }}>{a.outcome.replace('_', ' ')}</span>
            {a.notes && <span className="text-xs text-[#4B5563] truncate">{a.notes}</span>}
          </div>
        ))}
        {locked ? (
          <p className="text-xs text-[#F26161] bg-[#F26161]/10 rounded-lg px-3 py-2">Unreachable — 3 consecutive no-answers.</p>
        ) : open ? (
          <div className="bg-[#f3f4f6] rounded-lg p-3 space-y-2">
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className={inp}>
              <option value="answered">Answered</option>
              <option value="no_answer">No Answer</option>
              <option value="callback_scheduled">Callback Scheduled</option>
            </select>
            {outcome === 'callback_scheduled' && (
              <div>
                <input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} className={errCls(inp, !!callbackError)} />
                {callbackError && <p className="text-[11px] text-[#F26161] mt-1">{callbackError}</p>}
              </div>
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

function QualifyPanel({ lead, currentUser, onDone }: { lead: CrmLead; currentUser: { name: string }; onDone: () => void }) {
  const [f, setF] = useState<QualificationInput>({
    salary_bracket: lead.salary_bracket ?? '', down_payment_bracket: lead.down_payment_bracket ?? '',
    financing_program: lead.financing_program ?? 'new_car', car_source: lead.car_source ?? 'dealer',
    occupation: lead.occupation ?? '', customer_national_id: lead.customer_national_id ?? '',
    requested_car_brand: lead.requested_car_brand ?? '', requested_car_year: lead.requested_car_year ?? undefined,
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
    await qualifyLead(lead.id, f, currentUser.name)
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
            <option value="">Salary…</option><option value="below_3000">&lt; 3,000</option><option value="3000_5000">3,000–5,000</option><option value="5000_10000">5,000–10,000</option><option value="10000_20000">10,000–20,000</option><option value="20000_plus">20,000+</option>
          </select>
          {salaryError && <p className="text-[11px] text-[#F26161] mt-1">{salaryError}</p>}
        </div>
        <div>
          <select value={f.down_payment_bracket} onChange={(e) => set('down_payment_bracket', e.target.value)} className={errCls(inp, !!downError)}>
            <option value="">Down payment…</option><option value="below_20pct">&lt;20%</option><option value="20_30pct">20–30%</option><option value="30_50pct">30–50%</option><option value="above_50pct">&gt;50%</option>
          </select>
          {downError && <p className="text-[11px] text-[#F26161] mt-1">{downError}</p>}
        </div>
        <select value={f.financing_program ?? 'new_car'} onChange={(e) => set('financing_program', e.target.value)} className={inp}>
          <option value="new_car">New Car</option><option value="used_car">Used Car</option><option value="collateral">Collateral</option>
        </select>
        <select value={f.car_source ?? 'dealer'} onChange={(e) => set('car_source', e.target.value)} className={inp}>
          <option value="dealer">Dealer</option><option value="individual_c2c">Individual</option><option value="undecided">Undecided</option>
        </select>
        <div>
          <input value={f.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="Occupation" className={errCls(inp, !!occError)} />
          {occError && <p className="text-[11px] text-[#F26161] mt-1">{occError}</p>}
        </div>
        <input value={f.customer_national_id} onChange={(e) => set('customer_national_id', e.target.value)} placeholder="National ID" className={inp} />
        <input value={f.requested_car_brand} onChange={(e) => set('requested_car_brand', e.target.value)} placeholder="Car brand" className={inp} />
        <input type="number" value={f.requested_car_year ?? ''} onChange={(e) => set('requested_car_year', e.target.value ? Number(e.target.value) : undefined)} placeholder="Year" className={inp} />
      </div>
      <button onClick={qualify} disabled={saving} className="mt-3 w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-black font-semibold text-sm rounded-lg py-2.5 transition-colors">
        {saving ? 'Qualifying…' : '✅ Qualify & Send to Direct Sales'}
      </button>
    </Section>
  )
}

function CreditSubmitPanel({ lead, currentUser, onDone }: { lead: CrmLead; currentUser: { name: string }; onDone: () => void }) {
  const [docUrl, setDocUrl] = useState(lead.id_document_url ?? '')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const docError = touched && !docUrl.trim() ? 'Attach the ID document link first' : null

  async function submit() {
    setTouched(true)
    if (!docUrl.trim()) { toast.error('Attach the ID document link first'); return }
    setSaving(true)
    await updateLead(lead.id, { id_document_url: docUrl.trim(), stage: 'credit_submitted' }, currentUser.name, 'Documents collected → submitted to Credit')
    setSaving(false)
    toast.success('Submitted to Credit')
    onDone()
  }
  return (
    <Section title="Documents & Credit">
      <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="ID document URL (upload link)" className={errCls(inp, !!docError)} />
      {docError && <p className="text-[11px] text-[#F26161] mt-1">{docError}</p>}
      <p className="text-[10px] text-[#6B7280] mt-1">File upload is stubbed for the frontend — paste a link. Backend wires real storage.</p>
      <button onClick={submit} disabled={saving} className="mt-3 w-full bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-2.5 transition-colors">
        {saving ? 'Submitting…' : '🏦 Submit to Credit'}
      </button>
    </Section>
  )
}

function DispositionPanel({ lead, stage, currentUser, onDone }: { lead: CrmLead; stage: CallStage; currentUser: { name: string }; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  async function dispose(d: Disposition) {
    const note = d === 'unqualified' ? (window.prompt('Reason?') ?? '') : ''
    setBusy(true)
    await setDisposition(lead.id, stage, d, note, currentUser.name)
    setBusy(false)
    toast.success(`Marked ${d}`)
    onDone()
  }
  return (
    <Section title="Disposition">
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
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const atError = touched && !at ? 'Pick a time' : null
  async function save() {
    setTouched(true)
    if (!at) { toast.error('Pick a time'); return }
    await scheduleReminder(currentUser.id, lead.id, new Date(at).toISOString(), note)
    toast.success('Reminder scheduled'); setAt(''); setNote(''); setTouched(false)
  }
  return (
    <Section title="Self reminder">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={errCls(inp, !!atError)} />
          {atError && <p className="text-[11px] text-[#F26161] mt-1">{atError}</p>}
        </div>
        <button onClick={save} aria-label="Schedule reminder" className="px-3 py-2 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] text-sm rounded-lg transition-colors">🔔</button>
      </div>
    </Section>
  )
}

function errCls(base: string, hasError: boolean) {
  return hasError ? base.replace('border-[#e5e7eb]', 'border-[#F26161]').replace('focus:ring-[#5757e6]', 'focus:ring-[#F26161]') : base
}

const inp = 'w-full bg-[#f7f8fa] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
