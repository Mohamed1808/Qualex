// ============================================================================
// CRM v2 — DATA SERVICE (the backend integration seam)
// ----------------------------------------------------------------------------
// This is the ONLY file the backend developer needs to rewrite. Every screen
// calls these async functions; today they read/write an in-browser localStorage
// store seeded from mock-data.ts. Replace each function body with a real API /
// database call (e.g. fetch('/api/leads')) and the entire UI keeps working.
//
// All functions are async on purpose so swapping in network calls needs no UI
// changes.
// ============================================================================

'use client'

import {
  SEED_STATUSES, SEED_PROJECTS, SEED_TEAMS, SEED_USERS, SEED_LEADS,
  SEED_COMMENTS, SEED_REMINDERS, SEED_DISTRIBUTIONS, SEED_ATTENDANCE, SEED_CALL_ATTEMPTS,
  makeLead,
} from './mock-data'
import type {
  LeadStatus, Project, Team, CrmUser, CrmLead, LeadComment, LeadReminder,
  LeadHistoryEntry, DistributionSchedule, LeadFilter, WhatsAppMessage,
  Attendance, CallAttempt, CallStage, CallOutcome, Disposition, LeadStage,
} from './types'

// v4: added channels/campaign/KYC/vehicle/auto-callback fields — bump to reseed.
const KEY = 'qualex-crm-v4'

interface Store {
  statuses: LeadStatus[]
  projects: Project[]
  teams: Team[]
  users: CrmUser[]
  leads: CrmLead[]
  comments: LeadComment[]
  reminders: LeadReminder[]
  distributions: DistributionSchedule[]
  history: LeadHistoryEntry[]
  whatsapp: WhatsAppMessage[]
  attendance: Attendance[]
  callAttempts: CallAttempt[]
}

function seed(): Store {
  return {
    statuses: structuredClone(SEED_STATUSES),
    projects: structuredClone(SEED_PROJECTS),
    teams: structuredClone(SEED_TEAMS),
    users: structuredClone(SEED_USERS),
    leads: structuredClone(SEED_LEADS),
    comments: structuredClone(SEED_COMMENTS),
    reminders: structuredClone(SEED_REMINDERS),
    distributions: structuredClone(SEED_DISTRIBUTIONS),
    attendance: structuredClone(SEED_ATTENDANCE),
    callAttempts: structuredClone(SEED_CALL_ATTEMPTS),
    history: SEED_LEADS.map((l) => ({
      id: `h-${l.id}`, lead_id: l.id, at: l.created_at,
      actor_name: 'System', type: 'created' as const, detail: 'Lead created',
    })),
    whatsapp: [],
  }
}

function read(): Store {
  if (typeof window === 'undefined') return seed()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      const s = seed()
      window.localStorage.setItem(KEY, JSON.stringify(s))
      return s
    }
    return JSON.parse(raw) as Store
  } catch {
    return seed()
  }
}

function write(s: Store) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(s))
}

/** Wipe the demo store back to seed (handy for demos). */
export function resetCrmStore() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
}

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()
const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120))

// ---------------------------------------------------------------- STATUSES
export async function listStatuses(): Promise<LeadStatus[]> {
  return delay(read().statuses.sort((a, b) => a.sort_order - b.sort_order))
}
export async function createStatus(input: Omit<LeadStatus, 'id'>): Promise<LeadStatus> {
  const s = read()
  const status: LeadStatus = { ...input, id: uid() }
  s.statuses.push(status)
  write(s)
  return delay(status)
}
export async function updateStatus(id: string, patch: Partial<LeadStatus>): Promise<void> {
  const s = read()
  s.statuses = s.statuses.map((x) => (x.id === id ? { ...x, ...patch } : x))
  write(s)
  return delay(undefined)
}
export async function deleteStatus(id: string): Promise<void> {
  const s = read()
  s.statuses = s.statuses.filter((x) => x.id !== id)
  write(s)
  return delay(undefined)
}

// ---------------------------------------------------------------- PROJECTS
export async function listProjects(): Promise<Project[]> {
  return delay(read().projects)
}
export async function createProject(input: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
  const s = read()
  const project: Project = { ...input, id: uid(), created_at: now() }
  s.projects.push(project)
  write(s)
  return delay(project)
}
export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const s = read()
  s.projects = s.projects.map((x) => (x.id === id ? { ...x, ...patch } : x))
  write(s)
  return delay(undefined)
}

// ---------------------------------------------------------------- TEAMS
export async function listTeams(): Promise<Team[]> {
  return delay(read().teams)
}
export async function createTeam(input: Omit<Team, 'id' | 'created_at'>): Promise<Team> {
  const s = read()
  const team: Team = { ...input, id: uid(), created_at: now() }
  s.teams.push(team)
  write(s)
  return delay(team)
}
export async function updateTeam(id: string, patch: Partial<Team>): Promise<void> {
  const s = read()
  s.teams = s.teams.map((x) => (x.id === id ? { ...x, ...patch } : x))
  write(s)
  return delay(undefined)
}

// ---------------------------------------------------------------- USERS
export async function listUsers(): Promise<CrmUser[]> {
  return delay(read().users)
}
export async function createUser(input: Omit<CrmUser, 'id' | 'created_at' | 'history'>): Promise<CrmUser> {
  const s = read()
  const user: CrmUser = { ...input, id: uid(), created_at: now(), history: [{ at: now(), action: 'Account created' }] }
  s.users.push(user)
  write(s)
  return delay(user)
}
export async function updateUser(id: string, patch: Partial<CrmUser>, historyAction?: string): Promise<void> {
  const s = read()
  s.users = s.users.map((x) => {
    if (x.id !== id) return x
    const history = historyAction ? [...x.history, { at: now(), action: historyAction }] : x.history
    return { ...x, ...patch, history }
  })
  write(s)
  return delay(undefined)
}

// ---------------------------------------------------------------- LEADS
export async function listLeads(filter: LeadFilter = {}): Promise<CrmLead[]> {
  let leads = read().leads
  if (filter.status_id) leads = leads.filter((l) => l.status_id === filter.status_id)
  if (filter.project_id) leads = leads.filter((l) => l.project_id === filter.project_id)
  if (filter.assigned_user_id) leads = leads.filter((l) => l.assigned_user_id === filter.assigned_user_id)
  if (filter.channel) leads = leads.filter((l) => l.channel === filter.channel)
  if (filter.campaign) leads = leads.filter((l) => l.campaign === filter.campaign)
  if (filter.from) leads = leads.filter((l) => l.created_at >= filter.from!)
  if (filter.to) leads = leads.filter((l) => l.created_at <= filter.to!)
  if (filter.search) {
    const q = filter.search.toLowerCase()
    leads = leads.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(filter.search!))
  }
  return delay(leads.sort((a, b) => b.created_at.localeCompare(a.created_at)))
}

export async function createLead(input: Partial<CrmLead> & { name: string; phone: string }): Promise<CrmLead> {
  const s = read()
  const lead = makeLead({ ...input, id: uid(), created_at: now(), updated_at: now() })
  s.leads.push(lead)
  s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: 'System', type: 'created', detail: 'Lead created' })
  write(s)
  return delay(lead)
}

/** Bulk import (from CSV/manual list). */
export async function importLeads(rows: (Partial<CrmLead> & { name: string; phone: string })[]): Promise<number> {
  const s = read()
  for (const row of rows) {
    const lead = makeLead({ ...row, id: uid(), created_at: now(), updated_at: now() })
    s.leads.push(lead)
    s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: 'Import', type: 'created', detail: 'Imported' })
  }
  write(s)
  return delay(rows.length)
}

export async function updateLeadStatus(leadId: string, statusId: string, actorName: string): Promise<void> {
  const s = read()
  const status = s.statuses.find((x) => x.id === statusId)
  s.leads = s.leads.map((l) => (l.id === leadId ? { ...l, status_id: statusId, updated_at: now() } : l))
  s.history.push({ id: uid(), lead_id: leadId, at: now(), actor_name: actorName, type: 'status_change', detail: `Status → ${status?.name ?? statusId}` })
  write(s)
  return delay(undefined)
}

export async function assignLead(leadId: string, userId: string | null, actorName: string): Promise<void> {
  const s = read()
  const user = s.users.find((u) => u.id === userId)
  s.leads = s.leads.map((l) => (l.id === leadId ? { ...l, assigned_user_id: userId, updated_at: now() } : l))
  s.history.push({ id: uid(), lead_id: leadId, at: now(), actor_name: actorName, type: 'assignment', detail: userId ? `Assigned to ${user?.full_name ?? userId}` : 'Unassigned' })
  write(s)
  return delay(undefined)
}

/** Move a lead from one sales agent to another. */
export async function moveLead(leadId: string, toUserId: string, actorName: string): Promise<void> {
  return assignLead(leadId, toUserId, actorName)
}

export async function logContact(leadId: string, channel: string, actorName: string): Promise<void> {
  const s = read()
  s.history.push({ id: uid(), lead_id: leadId, at: now(), actor_name: actorName, type: 'contact', detail: `Contacted via ${channel}` })
  write(s)
  return delay(undefined)
}

// ---------------------------------------------------------------- COMMENTS / HISTORY
export async function listComments(leadId: string): Promise<LeadComment[]> {
  return delay(read().comments.filter((c) => c.lead_id === leadId).sort((a, b) => b.created_at.localeCompare(a.created_at)))
}
export async function addComment(leadId: string, authorId: string, authorName: string, body: string): Promise<LeadComment> {
  const s = read()
  const comment: LeadComment = { id: uid(), lead_id: leadId, author_id: authorId, author_name: authorName, body, created_at: now() }
  s.comments.push(comment)
  s.history.push({ id: uid(), lead_id: leadId, at: now(), actor_name: authorName, type: 'comment', detail: body })
  write(s)
  return delay(comment)
}
export async function listHistory(leadId: string): Promise<LeadHistoryEntry[]> {
  return delay(read().history.filter((h) => h.lead_id === leadId).sort((a, b) => b.at.localeCompare(a.at)))
}

// ---------------------------------------------------------------- REMINDERS
export async function listReminders(userId: string): Promise<LeadReminder[]> {
  return delay(read().reminders.filter((r) => r.user_id === userId))
}
export async function scheduleReminder(userId: string, leadId: string, remindAt: string, note: string): Promise<LeadReminder> {
  const s = read()
  const reminder: LeadReminder = { id: uid(), user_id: userId, lead_id: leadId, remind_at: remindAt, note, is_sent: false }
  s.reminders.push(reminder)
  write(s)
  return delay(reminder)
}

// ---------------------------------------------------------------- DISTRIBUTION
export async function listDistributions(): Promise<DistributionSchedule[]> {
  return delay(read().distributions)
}
export async function createDistribution(input: Omit<DistributionSchedule, 'id' | 'created_at' | 'last_run_at'>): Promise<DistributionSchedule> {
  const s = read()
  const dist: DistributionSchedule = { ...input, id: uid(), created_at: now(), last_run_at: null }
  s.distributions.push(dist)
  write(s)
  return delay(dist)
}
export async function updateDistribution(id: string, patch: Partial<DistributionSchedule>): Promise<void> {
  const s = read()
  s.distributions = s.distributions.map((x) => (x.id === id ? { ...x, ...patch } : x))
  write(s)
  return delay(undefined)
}

/** Run a distribution now: hand unassigned leads to target users, per_user_count each. */
export async function runDistribution(id: string, actorName: string): Promise<number> {
  const s = read()
  const dist = s.distributions.find((d) => d.id === id)
  if (!dist) return delay(0)
  let pool = s.leads.filter((l) => !l.assigned_user_id)
  if (dist.project_id) pool = pool.filter((l) => l.project_id === dist.project_id)
  if (dist.source_status_id) pool = pool.filter((l) => l.status_id === dist.source_status_id)
  let assigned = 0
  for (const userId of dist.target_user_ids) {
    const batch = pool.splice(0, dist.per_user_count)
    for (const lead of batch) {
      lead.assigned_user_id = userId
      lead.assigned_telesales_agent = userId
      if (lead.stage === 'new') lead.stage = 'telesales_assigned'
      lead.tele_sla_due_at = new Date(Date.now() + 4 * 3600_000).toISOString()
      lead.updated_at = now()
      s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: actorName, type: 'assignment', detail: `Auto-distributed to ${s.users.find((u) => u.id === userId)?.full_name ?? userId}` })
      assigned++
    }
  }
  dist.last_run_at = now()
  write(s)
  return delay(assigned)
}

// ---------------------------------------------------------------- UNIFIED WHATSAPP (provider stub)
export async function listWhatsApp(leadId: string): Promise<WhatsAppMessage[]> {
  return delay(read().whatsapp.filter((m) => m.lead_id === leadId).sort((a, b) => a.at.localeCompare(b.at)))
}
export async function sendWhatsApp(leadId: string, body: string): Promise<WhatsAppMessage> {
  // TODO(backend): POST to the WhatsApp Business API provider (Meta Cloud API /
  // 360dialog / Twilio) using the company's unified number. For now we just
  // append to the local store so the chat UI works.
  const s = read()
  const msg: WhatsAppMessage = { id: uid(), lead_id: leadId, direction: 'out', body, at: now() }
  s.whatsapp.push(msg)
  write(s)
  return delay(msg)
}

// ================================================================
// PIPELINE: Telesales → Direct Sales → Credit
// ================================================================
const slaDue = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString()
const SLA_TELE_HOURS = 4
const SLA_DS_HOURS = 24

function patchLead(s: Store, leadId: string, patch: Partial<CrmLead>) {
  s.leads = s.leads.map((l) => (l.id === leadId ? { ...l, ...patch, updated_at: now() } : l))
}
function logHistory(s: Store, leadId: string, actor: string, type: LeadHistoryEntry['type'], detail: string) {
  s.history.push({ id: uid(), lead_id: leadId, at: now(), actor_name: actor, type, detail })
}

/** Supervisor assigns a lead to a telesales agent. */
export async function assignTelesales(leadId: string, agentId: string, actor: string): Promise<void> {
  const s = read()
  const agent = s.users.find((u) => u.id === agentId)
  patchLead(s, leadId, { stage: 'telesales_assigned', assigned_telesales_agent: agentId, assigned_user_id: agentId, tele_sla_due_at: slaDue(SLA_TELE_HOURS), tele_sla_breached: false })
  logHistory(s, leadId, actor, 'assignment', `Assigned to telesales ${agent?.full_name ?? agentId}`)
  write(s); return delay(undefined)
}

/** DS supervisor assigns a qualified lead to a direct sales agent. */
export async function assignDirectSales(leadId: string, agentId: string, actor: string): Promise<void> {
  const s = read()
  const agent = s.users.find((u) => u.id === agentId)
  patchLead(s, leadId, { stage: 'ds_assigned', assigned_direct_sales_agent: agentId, assigned_user_id: agentId, direct_sales_assigned_at: now(), ds_sla_due_at: slaDue(SLA_DS_HOURS), ds_sla_breached: false })
  logHistory(s, leadId, actor, 'assignment', `Assigned to direct sales ${agent?.full_name ?? agentId}`)
  write(s); return delay(undefined)
}

export interface QualificationInput {
  name?: string; phone?: string
  salary_bracket?: string; down_payment_bracket?: string
  financing_program?: CrmLead['financing_program']; car_source?: CrmLead['car_source']
  knows_specific_car?: boolean; occupation?: string; customer_national_id?: string
  requested_car_brand?: string; requested_car_model?: string; requested_car_year?: number
  expected_program?: CrmLead['expected_program']
}

/** Telesales qualifies a lead → moves to DS supervisor's unassigned queue. */
export async function qualifyLead(leadId: string, qual: QualificationInput, actor: string): Promise<void> {
  const s = read()
  patchLead(s, leadId, { ...qual, stage: 'qualified', tele_disposition: 'qualified', telesales_qualified_at: now(), assigned_user_id: null })
  logHistory(s, leadId, actor, 'status_change', 'Qualified by telesales → sent to Direct Sales')
  write(s); return delay(undefined)
}

/** Apply a disposition at either stage (mirrors the old pipeline transitions). */
export async function setDisposition(leadId: string, stage: CallStage, disposition: Disposition, notes: string, actor: string): Promise<void> {
  const s = read()
  const patch: Partial<CrmLead> = {}
  let to: LeadStage | null = null
  if (stage === 'telesales') {
    patch.tele_disposition = disposition
    if (disposition === 'unqualified') { to = 'unqualified'; patch.unqualification_reason = notes }
    else if (disposition === 'terminated') to = 'terminated'
    else if (disposition === 'retired') to = 'retired'
    else if (disposition === 'no_answer') to = 'telesales_in_progress'
  } else {
    patch.ds_disposition = disposition
    if (disposition === 'unqualified') { to = 'rejected'; patch.unqualification_reason = notes }
    else if (disposition === 'terminated') to = 'terminated'
    else if (disposition === 'retired') to = 'retired'
    else if (disposition === 'no_answer') to = 'ds_in_progress'
  }
  if (to) patch.stage = to
  patchLead(s, leadId, patch)
  if (to) logHistory(s, leadId, actor, 'status_change', `Disposition: ${disposition}${notes ? ` — ${notes}` : ''}`)
  write(s); return delay(undefined)
}

// ---- call attempts (with 3-consecutive-no-answer auto-close) ----
export async function listCallAttempts(leadId: string, stage: CallStage): Promise<CallAttempt[]> {
  return delay(read().callAttempts.filter((c) => c.lead_id === leadId && c.stage === stage).sort((a, b) => a.attempt_number - b.attempt_number))
}

// Auto-callback intervals after consecutive no-answers: 30m, 1h, 24h.
const CALLBACK_MINUTES = [30, 60, 24 * 60]

export async function logCallAttempt(
  leadId: string, stage: CallStage, outcome: CallOutcome,
  callbackAt: string | null, notes: string | null, agentId: string, agentName: string,
  answeredCategory: import('./types').AnsweredCategory | null = null,
): Promise<{ ok: boolean; unreachable?: boolean; terminated?: boolean; autoCallbackAt?: string; error?: string }> {
  const s = read()
  const list = s.callAttempts.filter((c) => c.lead_id === leadId && c.stage === stage).sort((a, b) => a.attempt_number - b.attempt_number)
  let streak = 0
  for (let i = list.length - 1; i >= 0; i--) { if (list[i].outcome === 'no_answer') streak++; else break }
  // After 3 no-answers (each with its scheduled callback), a further no-answer terminates.
  if (streak >= 3) {
    patchLead(s, leadId, { stage: 'terminated', callback_locked: true, next_callback_at: null })
    logHistory(s, leadId, agentName, 'status_change', 'Auto-terminated after 3 no-answers and callbacks elapsed')
    write(s)
    return delay({ ok: false, terminated: true, error: 'Lead auto-terminated after 3 no-answers.' })
  }

  const nextNo = (list[list.length - 1]?.attempt_number ?? 0) + 1
  s.callAttempts.push({
    id: uid(), lead_id: leadId, agent_id: agentId, agent_name: agentName, stage,
    attempt_number: nextNo, outcome, answered_category: answeredCategory,
    callback_at: callbackAt, notes, called_at: now(),
  })

  let unreachable = false
  let autoCallbackAt: string | undefined
  const patch: Partial<CrmLead> = { stage: stage === 'telesales' ? 'telesales_in_progress' : 'ds_in_progress' }

  if (outcome === 'no_answer') {
    const newStreak = streak + 1
    // system-driven callback, non-editable by the agent
    const mins = CALLBACK_MINUTES[Math.min(newStreak - 1, CALLBACK_MINUTES.length - 1)]
    autoCallbackAt = new Date(Date.now() + mins * 60_000).toISOString()
    patch.next_callback_at = autoCallbackAt
    patch.callback_locked = true
  } else if (outcome === 'answered') {
    // engaged again — clear the auto-callback lock
    patch.next_callback_at = answeredCategory === 'specific_call_back_time' ? callbackAt : null
    patch.callback_locked = false
  } else if (outcome === 'callback_scheduled') {
    patch.next_callback_at = callbackAt
  }

  patchLead(s, leadId, patch)
  const detail = outcome === 'answered' && answeredCategory
    ? `Call attempt ${nextNo}: answered — ${answeredCategory.replace(/_/g, ' ')}${notes ? ` (${notes})` : ''}`
    : `Call attempt ${nextNo}: ${outcome}${notes ? ` — ${notes}` : ''}`
  logHistory(s, leadId, agentName, 'contact', detail)
  write(s); return delay({ ok: true, unreachable, autoCallbackAt })
}

/**
 * Reassign a lead to another agent at ANY stage, recording a supervisor comment
 * explaining why (e.g. an unqualified lead that needs re-tackling). Sets the
 * lead back to the appropriate assigned stage for the target agent's team.
 */
export async function reassignWithComment(
  leadId: string, toUserId: string, comment: string, actor: string,
): Promise<{ ok: boolean; error?: string }> {
  const s = read()
  const lead = s.leads.find((l) => l.id === leadId)
  const target = s.users.find((u) => u.id === toUserId)
  if (!lead || !target) return delay({ ok: false, error: 'Lead or user not found' })

  const isDS = target.role.startsWith('direct_sales')
  const patch: Partial<CrmLead> = { assigned_user_id: toUserId }
  if (isDS) {
    patch.assigned_direct_sales_agent = toUserId
    patch.stage = 'ds_assigned'
    patch.ds_sla_due_at = slaDue(SLA_DS_HOURS)
    patch.ds_sla_breached = false
    patch.direct_sales_assigned_at = now()
  } else {
    patch.assigned_telesales_agent = toUserId
    patch.stage = 'telesales_assigned'
    patch.tele_sla_due_at = slaDue(SLA_TELE_HOURS)
    patch.tele_sla_breached = false
  }
  // reopening a lead clears the auto-callback lock so the agent can work it
  patch.callback_locked = false
  patch.next_callback_at = null

  patchLead(s, leadId, patch)
  if (comment.trim()) {
    s.comments.push({ id: uid(), lead_id: leadId, author_id: 'supervisor', author_name: actor, body: comment.trim(), created_at: now() })
  }
  logHistory(s, leadId, actor, 'assignment', `Reassigned to ${target.full_name}${comment.trim() ? ` — ${comment.trim()}` : ''}`)
  write(s); return delay({ ok: true })
}

/**
 * Auto-assign all unassigned "new" telesales leads across active telesales
 * agents, balancing by current open-lead count (least-loaded first), with a
 * shuffle so ties are distributed randomly.
 */
export async function autoAssignBalanced(actor: string, leadIds?: string[]): Promise<number> {
  const s = read()
  const agents = s.users.filter((u) => u.role === 'telesales_agent' && u.is_active)
  if (agents.length === 0) return delay(0)

  // current open (telesales-stage) load per agent
  const TELE_STAGES = ['telesales_assigned', 'telesales_in_progress']
  const load: Record<string, number> = {}
  for (const a of agents) load[a.id] = s.leads.filter((l) => l.assigned_telesales_agent === a.id && TELE_STAGES.includes(l.stage)).length

  let pool = s.leads.filter((l) => l.stage === 'new' && !l.assigned_user_id)
  if (leadIds) pool = pool.filter((l) => leadIds.includes(l.id))
  // shuffle the pool for randomness
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]] }

  let assigned = 0
  for (const lead of pool) {
    // pick least-loaded agent (ties broken randomly by prior shuffle of agents)
    const shuffled = [...agents].sort(() => Math.random() - 0.5)
    const best = shuffled.reduce((b, a) => (load[a.id] < load[b.id] ? a : b))
    lead.assigned_user_id = best.id
    lead.assigned_telesales_agent = best.id
    lead.stage = 'telesales_assigned'
    lead.tele_sla_due_at = slaDue(SLA_TELE_HOURS)
    lead.updated_at = now()
    load[best.id]++
    s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: actor, type: 'assignment', detail: `Auto-assigned (balanced) to ${best.full_name}` })
    assigned++
  }
  write(s); return delay(assigned)
}

/** Assign a specific set of leads to one agent (bulk assign from a filter). */
export async function bulkAssign(leadIds: string[], toUserId: string, actor: string): Promise<number> {
  const s = read()
  const target = s.users.find((u) => u.id === toUserId)
  if (!target) return delay(0)
  const isDS = target.role.startsWith('direct_sales')
  let count = 0
  for (const id of leadIds) {
    const lead = s.leads.find((l) => l.id === id)
    if (!lead) continue
    lead.assigned_user_id = toUserId
    if (isDS) { lead.assigned_direct_sales_agent = toUserId; if (['qualified'].includes(lead.stage)) lead.stage = 'ds_assigned'; lead.direct_sales_assigned_at = now(); lead.ds_sla_due_at = slaDue(SLA_DS_HOURS) }
    else { lead.assigned_telesales_agent = toUserId; if (lead.stage === 'new') lead.stage = 'telesales_assigned'; lead.tele_sla_due_at = slaDue(SLA_TELE_HOURS) }
    lead.updated_at = now()
    s.history.push({ id: uid(), lead_id: id, at: now(), actor_name: actor, type: 'assignment', detail: `Bulk-assigned to ${target.full_name}` })
    count++
  }
  write(s); return delay(count)
}

// ---- attendance ----
function today() { return new Date().toISOString().slice(0, 10) }
export async function getAttendance(userId: string): Promise<Attendance> {
  const s = read()
  let a = s.attendance.find((x) => x.user_id === userId && x.date === today())
  if (!a) { a = { user_id: userId, date: today(), checked_in: false, checked_in_at: null, checked_out: false, checked_out_at: null, on_break: false, break_log: [] }; s.attendance.push(a); write(s) }
  return delay(a)
}
export async function listAttendance(): Promise<Attendance[]> {
  return delay(read().attendance.filter((a) => a.date === today()))
}
async function mutateAttendance(userId: string, fn: (a: Attendance) => void): Promise<void> {
  const s = read()
  let a = s.attendance.find((x) => x.user_id === userId && x.date === today())
  if (!a) { a = { user_id: userId, date: today(), checked_in: false, checked_in_at: null, checked_out: false, checked_out_at: null, on_break: false, break_log: [] }; s.attendance.push(a) }
  fn(a)
  write(s); return delay(undefined)
}
export const checkIn = (userId: string) => mutateAttendance(userId, (a) => { a.checked_in = true; a.checked_in_at = now(); a.checked_out = false; a.checked_out_at = null })
export const checkOut = (userId: string) => mutateAttendance(userId, (a) => { a.checked_out = true; a.checked_out_at = now(); a.on_break = false })
export const startBreak = (userId: string) => mutateAttendance(userId, (a) => { a.on_break = true; a.break_log.push({ started_at: now(), ended_at: null }) })
export const endBreak = (userId: string) => mutateAttendance(userId, (a) => { a.on_break = false; const last = a.break_log[a.break_log.length - 1]; if (last && !last.ended_at) last.ended_at = now() })

// ---- credit decision ----
export async function recordCreditDecision(leadId: string, decision: 'approved' | 'rejected', note: string, actor: string): Promise<void> {
  const s = read()
  patchLead(s, leadId, { stage: decision, ds_disposition: decision === 'approved' ? 'qualified' : 'unqualified', unqualification_reason: decision === 'rejected' ? (note || 'Credit rejected') : null })
  logHistory(s, leadId, actor, 'status_change', `Credit ${decision}${note ? ` — ${note}` : ''}`)
  write(s); return delay(undefined)
}

/** Update arbitrary lead fields (qualification edits, doc URL, etc.). */
export async function updateLead(leadId: string, patch: Partial<CrmLead>, actor?: string, detail?: string): Promise<void> {
  const s = read()
  patchLead(s, leadId, patch)
  if (actor && detail) logHistory(s, leadId, actor, 'status_change', detail)
  write(s); return delay(undefined)
}

/**
 * Merge a duplicate lead into the survivor: moves comments/history/call
 * attempts over, then deletes the duplicate. Fields the survivor is missing
 * (project, status, assignment) are backfilled from the duplicate.
 */
export async function mergeLeads(survivorId: string, duplicateId: string, actor: string): Promise<void> {
  const s = read()
  const survivor = s.leads.find((l) => l.id === survivorId)
  const duplicate = s.leads.find((l) => l.id === duplicateId)
  if (!survivor || !duplicate) return delay(undefined)

  const backfill: Partial<CrmLead> = {}
  if (!survivor.project_id && duplicate.project_id) backfill.project_id = duplicate.project_id
  if (!survivor.status_id && duplicate.status_id) backfill.status_id = duplicate.status_id
  if (!survivor.assigned_user_id && duplicate.assigned_user_id) backfill.assigned_user_id = duplicate.assigned_user_id
  if (!survivor.facebook_url && duplicate.facebook_url) backfill.facebook_url = duplicate.facebook_url
  patchLead(s, survivorId, backfill)

  s.comments = s.comments.map((c) => (c.lead_id === duplicateId ? { ...c, lead_id: survivorId } : c))
  s.history = s.history.map((h) => (h.lead_id === duplicateId ? { ...h, lead_id: survivorId } : h))
  s.callAttempts = s.callAttempts.map((c) => (c.lead_id === duplicateId ? { ...c, lead_id: survivorId } : c))
  s.leads = s.leads.filter((l) => l.id !== duplicateId)

  logHistory(s, survivorId, actor, 'status_change', `Merged duplicate lead (${duplicate.name}, ${duplicate.phone}) into this record`)
  write(s); return delay(undefined)
}
