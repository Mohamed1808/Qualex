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
  makeLead, formatEntryId,
} from './mock-data'
import type {
  LeadStatus, Project, Team, CrmUser, CrmLead, LeadComment, LeadReminder,
  LeadHistoryEntry, DistributionSchedule, LeadFilter, WhatsAppMessage,
  Attendance, CallAttempt, CallStage, CallOutcome, Disposition, LeadStage,
  ActivityLogEntry, ActivityCategory, ActivityFilter,
  AppNotification, NotificationType, UserRole,
} from './types'

// v11: cleared all seed leads (fresh start) — bump to reseed.
const KEY = 'qualex-crm-v11'
/** Same-tab live-update signal for the notification bell (cross-tab updates arrive via the native `storage` event). */
export const NOTIFICATIONS_EVENT = 'qualex-notifications-updated'

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
  activityLog: ActivityLogEntry[]
  notifications: AppNotification[]
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
    activityLog: [],
    notifications: [],
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
  // Same-tab live-update signal (the native `storage` event only fires in OTHER tabs).
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT))
}

/** Wipe the demo store back to seed (handy for demos). */
export function resetCrmStore() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
}

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

/**
 * Next sequential lead entry ID (DF-00001). Derived from the highest existing
 * DF-#### in the store so imported/created leads keep a gap-free running number.
 */
function nextEntryId(s: Store): string {
  let max = 0
  for (const l of s.leads) {
    const m = /^DF-(\d+)$/.exec(l.entry_id ?? '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return formatEntryId(max + 1)
}
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
    leads = leads.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(filter.search!) || l.entry_id.toLowerCase().includes(q))
  }
  return delay(leads.sort((a, b) => b.created_at.localeCompare(a.created_at)))
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').replace(/^0/, '20')
}

/** Checks for an existing lead with the same phone; flags + notifies if found. */
function detectDuplicate(s: Store, lead: CrmLead) {
  const norm = normalizePhone(lead.phone)
  const existing = s.leads.find((l) => l.id !== lead.id && normalizePhone(l.phone) === norm)
  if (!existing) return
  lead.is_duplicate = true
  lead.duplicate_of = existing.id
  notifyRole(s, 'telesales_supervisor', 'duplicate_detected', 'Duplicate lead detected',
    `${lead.name} (${lead.phone}) matches an existing lead.`, lead.id, lead.name, '/crm/duplicates')
}

export async function createLead(input: Partial<CrmLead> & { name: string; phone: string }): Promise<CrmLead> {
  const s = read()
  // New leads always start Fresh (status is agent-action-driven from here on).
  const lead = makeLead({ ...input, id: uid(), entry_id: nextEntryId(s), status_id: STATUS_FRESH, created_at: now(), updated_at: now() })
  s.leads.push(lead)
  s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: 'System', type: 'created', detail: 'Lead created' })
  detectDuplicate(s, lead)
  if (!lead.is_duplicate) {
    notifyRole(s, 'telesales_supervisor', 'new_unassigned_lead', 'New lead', `${lead.name} needs to be assigned.`, lead.id, lead.name, '/crm/telesales/queue?lead=' + lead.id)
  }
  write(s)
  return delay(lead)
}

/** Bulk import (from CSV/manual list). */
export async function importLeads(rows: (Partial<CrmLead> & { name: string; phone: string })[]): Promise<number> {
  const s = read()
  let duplicates = 0
  for (const row of rows) {
    const lead = makeLead({ ...row, id: uid(), entry_id: nextEntryId(s), status_id: STATUS_FRESH, created_at: now(), updated_at: now() })
    s.leads.push(lead)
    s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: 'Import', type: 'created', detail: 'Imported' })
    detectDuplicate(s, lead)
    if (lead.is_duplicate) duplicates++
  }
  const imported = rows.length - duplicates
  if (imported > 0) {
    notifyRole(s, 'telesales_supervisor', 'new_unassigned_lead', 'Leads imported', `${imported} new lead(s) imported and need to be assigned.`, null, null, '/crm/telesales/queue')
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
  const actorInfo = resolveUserById(s, authorId)
  const leadForLog = s.leads.find((l) => l.id === leadId)
  logActivity(s, { userId: actorInfo.id, userName: authorName, role: actorInfo.role, category: 'comment', action: body, leadId, leadName: leadForLog?.name })
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
  const actorInfo = resolveUserById(s, userId)
  const leadForLog = s.leads.find((l) => l.id === leadId)
  logActivity(s, { userId: actorInfo.id, userName: actorInfo.name, role: actorInfo.role, category: 'reminder', action: `Scheduled a reminder for ${new Date(remindAt).toLocaleString()}`, leadId, leadName: leadForLog?.name })
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

// ---- Auto-status --------------------------------------------------------
// The lead's sub-status chip is driven entirely by the agent's actions in the
// work drawer (it is read-only in the agent portal). Each action maps to one of
// the seeded status IDs. Applied via `autoStatus()` which no-ops if the target
// status has been removed in the admin portal, so status edits degrade cleanly.
const STATUS_FRESH = 'st-fresh'
const STATUS_NO_ANSWER = 'st-noanswer'
const STATUS_FOLLOW_UP = 'st-followup'
const STATUS_WAITING_ID = 'st-waitingid'
const STATUS_REQUEST = 'st-request'
const STATUS_QUALIFIED = 'st-qualified'
const STATUS_UNQUALIFIED = 'st-unqualified'
const STATUS_RETIRED = 'st-retired'
const STATUS_TERMINATED = 'st-terminated'
const STATUS_CREDIT_APPROVED = 'st-creditapproved'

const CATEGORY_STATUS: Record<import('./types').AnsweredCategory, string> = {
  pending_id: STATUS_WAITING_ID,
  inquiry_only: STATUS_REQUEST,
  high_interest: STATUS_REQUEST,
  follow_up_needed: STATUS_FOLLOW_UP,
  specific_call_back_time: STATUS_FOLLOW_UP,
}

/** Returns the status id only if it still exists in the store (else the current one). */
function autoStatus(s: Store, statusId: string, current: string | null): string | null {
  return s.statuses.some((x) => x.id === statusId) ? statusId : current
}

function patchLead(s: Store, leadId: string, patch: Partial<CrmLead>) {
  s.leads = s.leads.map((l) => (l.id === leadId ? { ...l, ...patch, updated_at: now() } : l))
}
function logHistory(s: Store, leadId: string, actor: string, type: LeadHistoryEntry['type'], detail: string) {
  s.history.push({ id: uid(), lead_id: leadId, at: now(), actor_name: actor, type, detail })
}

// ---- hidden agent activity log (SLA tracking) --------------------------
// Never read by agent-facing screens; only the supervisor/admin Activity Log
// page calls listActivityLog. Every timestamp here is captured at the moment
// the action actually happened, so supervisors can measure real response
// times (e.g. time from assignment to first call attempt).
function logActivity(
  s: Store,
  opts: { userId: string | null; userName: string; role: CrmUser['role'] | null; category: ActivityCategory; action: string; leadId?: string | null; leadName?: string | null },
) {
  s.activityLog.push({
    id: uid(), user_id: opts.userId, user_name: opts.userName, role: opts.role,
    category: opts.category, action: opts.action,
    lead_id: opts.leadId ?? null, lead_name: opts.leadName ?? null, at: now(),
  })
}
function resolveUserById(s: Store, userId: string | null | undefined): { id: string | null; name: string; role: CrmUser['role'] | null } {
  const u = userId ? s.users.find((x) => x.id === userId) : undefined
  return u ? { id: u.id, name: u.full_name, role: u.role } : { id: userId ?? null, name: userId ?? 'Unknown', role: null }
}
/** Best-effort id/role lookup when only a display name is available (supervisor actions). */
function resolveUserByName(s: Store, name: string): { id: string | null; name: string; role: CrmUser['role'] | null } {
  const u = s.users.find((x) => x.full_name === name)
  return u ? { id: u.id, name: u.full_name, role: u.role } : { id: null, name, role: null }
}

export async function listActivityLog(filter: ActivityFilter = {}): Promise<ActivityLogEntry[]> {
  let rows = read().activityLog
  if (filter.user_id) rows = rows.filter((r) => r.user_id === filter.user_id)
  if (filter.category) rows = rows.filter((r) => r.category === filter.category)
  if (filter.lead_id) rows = rows.filter((r) => r.lead_id === filter.lead_id)
  if (filter.from) rows = rows.filter((r) => r.at >= filter.from!)
  if (filter.to) rows = rows.filter((r) => r.at <= filter.to!)
  return delay(rows.sort((a, b) => b.at.localeCompare(a.at)))
}

// ================================================================
// NOTIFICATIONS — user-facing, cross-role (see types.ts for the full trigger
// list). Every notify* call below pushes a row and write() broadcasts the
// same-tab NOTIFICATIONS_EVENT; the NotificationBell component listens for
// that plus the native cross-tab `storage` event.
// ================================================================
function notifyUser(
  s: Store,
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  leadId?: string | null,
  leadName?: string | null,
  link?: string | null,
) {
  s.notifications.push({
    id: uid(), user_id: userId, type, title, message,
    lead_id: leadId ?? null, lead_name: leadName ?? null, link: link ?? null,
    is_read: false, created_at: now(),
  })
}
/** Notify every active user holding a given role (e.g. all telesales supervisors). */
function notifyRole(s: Store, role: UserRole, type: NotificationType, title: string, message: string, leadId?: string | null, leadName?: string | null, link?: string | null) {
  for (const u of s.users.filter((x) => x.role === role && x.is_active)) {
    notifyUser(s, u.id, type, title, message, leadId, leadName, link)
  }
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  return delay(read().notifications.filter((n) => n.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)))
}
export async function markNotificationRead(id: string): Promise<void> {
  const s = read()
  s.notifications = s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
  write(s); return delay(undefined)
}
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const s = read()
  s.notifications = s.notifications.map((n) => (n.user_id === userId ? { ...n, is_read: true } : n))
  write(s); return delay(undefined)
}

/**
 * Time-based notification sweep: fires callback-due and reminder-due
 * notifications once their due time has passed. Call periodically (e.g. every
 * 30s) from a top-level component — cheap no-op when nothing is due.
 */
export async function runNotificationSweep(): Promise<void> {
  const s = read()
  const nowIso = now()
  let changed = false

  for (const lead of s.leads) {
    if (lead.next_callback_at && !lead.callback_notified && lead.next_callback_at <= nowIso) {
      const agentId = lead.assigned_direct_sales_agent && DS_STAGES_FOR_SWEEP.includes(lead.stage)
        ? lead.assigned_direct_sales_agent
        : lead.assigned_telesales_agent
      if (agentId) {
        notifyUser(s, agentId, 'callback_due', 'Callback due', `${lead.name} is due for a callback now.`, lead.id, lead.name, '/crm/sales?lead=' + lead.id)
      }
      lead.callback_notified = true
      changed = true
    }
  }

  for (const r of s.reminders) {
    if (!r.is_sent && r.remind_at <= nowIso) {
      const lead = s.leads.find((l) => l.id === r.lead_id)
      notifyUser(s, r.user_id, 'reminder_due', 'Reminder', lead ? `Follow up with ${lead.name}${r.note ? ` — ${r.note}` : ''}` : 'You have a scheduled reminder.', r.lead_id, lead?.name ?? null, '/crm/sales?lead=' + r.lead_id)
      r.is_sent = true
      changed = true
    }
  }

  if (changed) write(s)
}
const DS_STAGES_FOR_SWEEP = ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted']

/** Supervisor assigns a lead to a telesales agent. */
export async function assignTelesales(leadId: string, agentId: string, actor: string): Promise<void> {
  const s = read()
  const agent = s.users.find((u) => u.id === agentId)
  patchLead(s, leadId, { stage: 'telesales_assigned', assigned_telesales_agent: agentId, assigned_user_id: agentId, status_id: STATUS_FRESH, tele_sla_due_at: slaDue(SLA_TELE_HOURS), tele_sla_breached: false })
  logHistory(s, leadId, actor, 'assignment', `Assigned to telesales ${agent?.full_name ?? agentId}`)
  const actorInfo = resolveUserByName(s, actor)
  const leadForLog = s.leads.find((l) => l.id === leadId)
  logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'assignment', action: `Assigned to telesales ${agent?.full_name ?? agentId}`, leadId, leadName: leadForLog?.name })
  notifyUser(s, agentId, 'lead_assigned', 'New lead assigned', `${leadForLog?.name ?? 'A lead'} has been assigned to you.`, leadId, leadForLog?.name, '/crm/sales?lead=' + leadId)
  write(s); return delay(undefined)
}

/** DS supervisor assigns a qualified lead to a direct sales agent. */
export async function assignDirectSales(leadId: string, agentId: string, actor: string): Promise<void> {
  const s = read()
  const agent = s.users.find((u) => u.id === agentId)
  patchLead(s, leadId, { stage: 'ds_assigned', assigned_direct_sales_agent: agentId, assigned_user_id: agentId, status_id: STATUS_FRESH, direct_sales_assigned_at: now(), ds_sla_due_at: slaDue(SLA_DS_HOURS), ds_sla_breached: false })
  logHistory(s, leadId, actor, 'assignment', `Assigned to direct sales ${agent?.full_name ?? agentId}`)
  const actorInfo = resolveUserByName(s, actor)
  const leadForLog = s.leads.find((l) => l.id === leadId)
  logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'assignment', action: `Assigned to direct sales ${agent?.full_name ?? agentId}`, leadId, leadName: leadForLog?.name })
  notifyUser(s, agentId, 'lead_assigned', 'New lead assigned', `${leadForLog?.name ?? 'A lead'} has been assigned to you.`, leadId, leadForLog?.name, '/crm/sales?lead=' + leadId)
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
export async function qualifyLead(leadId: string, qual: QualificationInput, actor: string, actorId?: string): Promise<void> {
  const s = read()
  const leadForLog = s.leads.find((l) => l.id === leadId)
  patchLead(s, leadId, { ...qual, stage: 'qualified', tele_disposition: 'qualified', telesales_qualified_at: now(), assigned_user_id: null, status_id: autoStatus(s, STATUS_QUALIFIED, leadForLog?.status_id ?? null) })
  logHistory(s, leadId, actor, 'status_change', 'Qualified by telesales → sent to Direct Sales')
  const actorInfo = resolveUserById(s, actorId)
  logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'qualify', action: 'Qualified lead — sent to Direct Sales', leadId, leadName: leadForLog?.name })
  notifyRole(s, 'direct_sales_supervisor', 'qualified_to_ds', 'Lead qualified', `${leadForLog?.name ?? 'A lead'} was qualified by telesales and needs assignment.`, leadId, leadForLog?.name, '/crm/direct-sales/queue?lead=' + leadId)
  write(s); return delay(undefined)
}

/** Apply a disposition at either stage (mirrors the old pipeline transitions). */
export async function setDisposition(leadId: string, stage: CallStage, disposition: Disposition, notes: string, actor: string, actorId?: string): Promise<void> {
  const s = read()
  const leadForLog = s.leads.find((l) => l.id === leadId)
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
  // Reflect the disposition in the sub-status chip.
  const dispStatus =
    disposition === 'unqualified' ? STATUS_UNQUALIFIED
    : disposition === 'no_answer' ? STATUS_NO_ANSWER
    : disposition === 'retired' ? STATUS_RETIRED
    : disposition === 'terminated' ? STATUS_TERMINATED
    : null
  if (dispStatus) patch.status_id = autoStatus(s, dispStatus, leadForLog?.status_id ?? null)
  patchLead(s, leadId, patch)
  if (to) logHistory(s, leadId, actor, 'status_change', `Disposition: ${disposition}${notes ? ` — ${notes}` : ''}`)
  const actorInfo = resolveUserById(s, actorId)
  logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'disposition', action: `Disposition: ${disposition}${notes ? ` — ${notes}` : ''}`, leadId, leadName: leadForLog?.name })
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
  const leadForLog = s.leads.find((l) => l.id === leadId)
  const actorInfo = resolveUserById(s, agentId)

  // After 3 no-answers (each with its scheduled callback), a further no-answer terminates.
  if (streak >= 3) {
    patchLead(s, leadId, { stage: 'terminated', callback_locked: true, next_callback_at: null, callback_notified: false, status_id: autoStatus(s, STATUS_TERMINATED, leadForLog?.status_id ?? null) })
    logHistory(s, leadId, agentName, 'status_change', 'Auto-terminated after 3 no-answers and callbacks elapsed')
    logActivity(s, { userId: actorInfo.id, userName: agentName, role: actorInfo.role, category: 'call_attempt', action: 'Lead auto-terminated after 3 no-answers', leadId, leadName: leadForLog?.name })
    const supervisorRole = stage === 'direct_sales' ? 'direct_sales_supervisor' : 'telesales_supervisor'
    notifyRole(s, supervisorRole, 'lead_auto_terminated', 'Lead auto-terminated', `${leadForLog?.name ?? 'A lead'} was auto-terminated after 3 no-answers.`, leadId, leadForLog?.name, '/crm/leads')
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
    patch.callback_notified = false
    patch.status_id = autoStatus(s, STATUS_NO_ANSWER, leadForLog?.status_id ?? null)
  } else if (outcome === 'answered') {
    // engaged again — clear the auto-callback lock. Both "specific call back time"
    // and "follow up needed" require the agent to book the next call (see UI),
    // so carry that chosen time through as the (agent-set, editable) callback.
    const needsBooking = answeredCategory === 'specific_call_back_time' || answeredCategory === 'follow_up_needed'
    patch.next_callback_at = needsBooking ? callbackAt : null
    patch.callback_locked = false
    patch.callback_notified = false
    if (answeredCategory) patch.status_id = autoStatus(s, CATEGORY_STATUS[answeredCategory], leadForLog?.status_id ?? null)
  } else if (outcome === 'callback_scheduled') {
    patch.next_callback_at = callbackAt
    patch.callback_notified = false
    patch.status_id = autoStatus(s, STATUS_FOLLOW_UP, leadForLog?.status_id ?? null)
  }

  patchLead(s, leadId, patch)
  const detail = outcome === 'answered' && answeredCategory
    ? `Call attempt ${nextNo}: answered — ${answeredCategory.replace(/_/g, ' ')}${notes ? ` (${notes})` : ''}`
    : `Call attempt ${nextNo}: ${outcome}${notes ? ` — ${notes}` : ''}`
  logHistory(s, leadId, agentName, 'contact', detail)
  logActivity(s, { userId: actorInfo.id, userName: agentName, role: actorInfo.role, category: 'call_attempt', action: detail, leadId, leadName: leadForLog?.name })
  write(s); return delay({ ok: true, unreachable, autoCallbackAt })
}

/**
 * Reassign a lead to another agent at ANY stage, recording a supervisor comment
 * explaining why (e.g. an unqualified lead that needs re-tackling). Sets the
 * lead back to the appropriate assigned stage for the target agent's team.
 */
export async function reassignWithComment(
  leadId: string, toUserId: string, comment: string, actor: string, actorId?: string,
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
  patch.callback_notified = false

  patchLead(s, leadId, patch)
  if (comment.trim()) {
    s.comments.push({ id: uid(), lead_id: leadId, author_id: 'supervisor', author_name: actor, body: comment.trim(), created_at: now() })
  }
  logHistory(s, leadId, actor, 'assignment', `Reassigned to ${target.full_name}${comment.trim() ? ` — ${comment.trim()}` : ''}`)
  const actorInfo = resolveUserById(s, actorId)
  logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'reassignment', action: `Reassigned to ${target.full_name}${comment.trim() ? ` — ${comment.trim()}` : ''}`, leadId, leadName: lead.name })
  notifyUser(s, toUserId, 'lead_reassigned', 'Lead reassigned to you', `${lead.name} was reassigned to you${comment.trim() ? `: "${comment.trim()}"` : '.'}`, leadId, lead.name, '/crm/sales?lead=' + leadId)
  write(s); return delay({ ok: true })
}

const MAX_LEADS_PER_AGENT = 20
const ROUND_BATCH = 5

/**
 * Auto-assign unassigned head-of-flow leads to checked-in agents in balanced
 * rounds:
 *   1. Only agents checked in today (and not checked out) are eligible.
 *   2. Each round, agents are ordered by current load (lowest first) and each
 *      receives up to ROUND_BATCH (5) leads, never exceeding MAX_LEADS_PER_AGENT
 *      (20) in total.
 *   3. Rounds repeat — re-sorting by load each time — until the pool is empty or
 *      every eligible agent has hit the 20-lead cap.
 *
 * Telesales distributes unassigned "new" leads; Direct Sales distributes
 * unassigned "qualified" leads that telesales handed over.
 */
export async function autoAssignBalanced(
  actor: string, team: 'telesales' | 'direct_sales' = 'telesales', leadIds?: string[],
): Promise<{ assigned: number; skipped: number; reason?: string }> {
  const s = read()
  const isDS = team === 'direct_sales'
  const agentRole = isDS ? 'direct_sales_agent' : 'telesales_agent'
  const teamLabel = isDS ? 'direct sales' : 'telesales'
  const today = new Date().toISOString().slice(0, 10)
  const checkedInIds = new Set(
    s.attendance.filter((a) => a.date === today && a.checked_in && !a.checked_out).map((a) => a.user_id)
  )
  const agents = s.users.filter((u) => u.role === agentRole && u.is_active && checkedInIds.has(u.id))
  if (agents.length === 0) return delay({ assigned: 0, skipped: 0, reason: `No ${teamLabel} agents are currently checked in.` })

  // current active-lead load per agent (any non-terminal stage in this team they hold)
  const ACTIVE_STAGES = isDS ? ['ds_assigned', 'ds_in_progress', 'id_collected'] : ['telesales_assigned', 'telesales_in_progress']
  const agentField: keyof CrmLead = isDS ? 'assigned_direct_sales_agent' : 'assigned_telesales_agent'
  const load: Record<string, number> = {}
  for (const a of agents) load[a.id] = s.leads.filter((l) => l[agentField] === a.id && ACTIVE_STAGES.includes(l.stage)).length

  const headStage = isDS ? 'qualified' : 'new'
  let pool = s.leads.filter((l) => l.stage === headStage && !l.assigned_user_id)
  if (leadIds) pool = pool.filter((l) => leadIds.includes(l.id))

  function assignOne(lead: CrmLead, agent: CrmUser) {
    lead.assigned_user_id = agent.id
    if (isDS) {
      lead.assigned_direct_sales_agent = agent.id
      lead.stage = 'ds_assigned'
      lead.direct_sales_assigned_at = now()
      lead.ds_sla_due_at = slaDue(SLA_DS_HOURS)
    } else {
      lead.assigned_telesales_agent = agent.id
      lead.stage = 'telesales_assigned'
      lead.tele_sla_due_at = slaDue(SLA_TELE_HOURS)
    }
    lead.status_id = autoStatus(s, STATUS_FRESH, lead.status_id)
    lead.updated_at = now()
    s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: actor, type: 'assignment', detail: `Auto-assigned (checked-in, balanced rounds of ${ROUND_BATCH}, cap ${MAX_LEADS_PER_AGENT}) to ${agent.full_name}` })
  }

  let assigned = 0
  const perAgentCount: Record<string, number> = {}
  // Balanced rounds: lowest-load agent first, up to ROUND_BATCH each, repeat.
  while (pool.length > 0) {
    const available = agents.filter((a) => load[a.id] < MAX_LEADS_PER_AGENT).sort((x, y) => load[x.id] - load[y.id])
    if (available.length === 0) break // everyone is at the cap
    let progressed = false
    for (const agent of available) {
      if (pool.length === 0) break
      const room = MAX_LEADS_PER_AGENT - load[agent.id]
      const take = Math.min(ROUND_BATCH, room, pool.length)
      for (let k = 0; k < take; k++) {
        const lead = pool.shift()!
        assignOne(lead, agent)
        load[agent.id]++
        perAgentCount[agent.id] = (perAgentCount[agent.id] ?? 0) + 1
        assigned++
        progressed = true
      }
    }
    if (!progressed) break
  }
  const skipped = pool.length

  if (assigned > 0) {
    const actorInfo = resolveUserByName(s, actor)
    logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'assignment', action: `Auto-assigned ${assigned} ${teamLabel} lead(s) (balanced rounds of ${ROUND_BATCH}, checked-in agents under ${MAX_LEADS_PER_AGENT} leads)` })
    for (const [agentId, count] of Object.entries(perAgentCount)) {
      notifyUser(s, agentId, 'lead_assigned', 'New leads assigned', `${count} new lead(s) have been assigned to you.`, null, null, '/crm/sales')
    }
  }
  write(s)
  return delay({ assigned, skipped, reason: skipped > 0 ? `${skipped} lead(s) left unassigned — all checked-in agents are at the ${MAX_LEADS_PER_AGENT}-lead cap.` : undefined })
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
    lead.status_id = autoStatus(s, STATUS_FRESH, lead.status_id)
    lead.updated_at = now()
    s.history.push({ id: uid(), lead_id: id, at: now(), actor_name: actor, type: 'assignment', detail: `Bulk-assigned to ${target.full_name}` })
    count++
  }
  if (count > 0) {
    const actorInfo = resolveUserByName(s, actor)
    logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'assignment', action: `Bulk-assigned ${count} lead(s) to ${target.full_name}` })
    notifyUser(s, toUserId, 'lead_assigned', 'Leads assigned', `${count} lead(s) have been assigned to you.`, null, null, '/crm/sales')
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
async function mutateAttendance(userId: string, fn: (a: Attendance) => void, action: string): Promise<void> {
  const s = read()
  let a = s.attendance.find((x) => x.user_id === userId && x.date === today())
  if (!a) { a = { user_id: userId, date: today(), checked_in: false, checked_in_at: null, checked_out: false, checked_out_at: null, on_break: false, break_log: [] }; s.attendance.push(a) }
  fn(a)
  const actorInfo = resolveUserById(s, userId)
  logActivity(s, { userId: actorInfo.id, userName: actorInfo.name, role: actorInfo.role, category: 'attendance', action })
  write(s); return delay(undefined)
}
export const checkIn = (userId: string) => mutateAttendance(userId, (a) => { a.checked_in = true; a.checked_in_at = now(); a.checked_out = false; a.checked_out_at = null }, 'Checked in')
export const checkOut = (userId: string) => mutateAttendance(userId, (a) => { a.checked_out = true; a.checked_out_at = now(); a.on_break = false }, 'Checked out')
export const startBreak = (userId: string) => mutateAttendance(userId, (a) => { a.on_break = true; a.break_log.push({ started_at: now(), ended_at: null }) }, 'Started break')
export const endBreak = (userId: string) => mutateAttendance(userId, (a) => { a.on_break = false; const last = a.break_log[a.break_log.length - 1]; if (last && !last.ended_at) last.ended_at = now() }, 'Ended break')

// ---- credit decision ----
export async function recordCreditDecision(leadId: string, decision: 'approved' | 'rejected', note: string, actor: string, actorId?: string): Promise<void> {
  const s = read()
  const leadForLog = s.leads.find((l) => l.id === leadId)
  patchLead(s, leadId, {
    stage: decision, ds_disposition: decision === 'approved' ? 'qualified' : 'unqualified',
    unqualification_reason: decision === 'rejected' ? (note || 'Credit rejected') : null,
    status_id: autoStatus(s, decision === 'approved' ? STATUS_CREDIT_APPROVED : STATUS_UNQUALIFIED, leadForLog?.status_id ?? null),
  })
  logHistory(s, leadId, actor, 'status_change', `Credit ${decision}${note ? ` — ${note}` : ''}`)
  const actorInfo = resolveUserById(s, actorId)
  logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category: 'credit_decision', action: `Credit ${decision}${note ? ` — ${note}` : ''}`, leadId, leadName: leadForLog?.name })
  if (leadForLog?.assigned_direct_sales_agent) {
    notifyUser(s, leadForLog.assigned_direct_sales_agent, 'credit_decision', `Credit ${decision}`, `${leadForLog.name} was ${decision}${note ? ` — ${note}` : ''}.`, leadId, leadForLog.name, '/crm/sales?lead=' + leadId)
  }
  write(s); return delay(undefined)
}

/** Update arbitrary lead fields (qualification edits, doc URL, etc.). */
export async function updateLead(leadId: string, patch: Partial<CrmLead>, actor?: string, detail?: string, actorId?: string): Promise<void> {
  const s = read()
  const leadForLog = s.leads.find((l) => l.id === leadId)
  patchLead(s, leadId, patch)
  if (actor && detail) {
    logHistory(s, leadId, actor, 'status_change', detail)
    const actorInfo = resolveUserById(s, actorId)
    const category: ActivityCategory = patch.stage === 'credit_submitted' ? 'credit_submit' : 'kyc_update'
    logActivity(s, { userId: actorInfo.id, userName: actor, role: actorInfo.role, category, action: detail, leadId, leadName: leadForLog?.name })
    if (patch.stage === 'credit_submitted') {
      notifyRole(s, 'admin', 'credit_submitted', 'Credit decision needed', `${leadForLog?.name ?? 'A lead'} was submitted to Credit and is awaiting a decision.`, leadId, leadForLog?.name, '/crm/credit')
      notifyRole(s, 'direct_sales_supervisor', 'credit_submitted', 'Submitted to Credit', `${leadForLog?.name ?? 'A lead'} was submitted to Credit by your team.`, leadId, leadForLog?.name, '/crm/credit')
    }
  }
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
