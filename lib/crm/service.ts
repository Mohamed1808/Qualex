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
  SEED_COMMENTS, SEED_REMINDERS, SEED_DISTRIBUTIONS,
} from './mock-data'
import type {
  LeadStatus, Project, Team, CrmUser, CrmLead, LeadComment, LeadReminder,
  LeadHistoryEntry, DistributionSchedule, LeadFilter, WhatsAppMessage,
} from './types'

const KEY = 'qualex-crm-v2'

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
  if (filter.from) leads = leads.filter((l) => l.created_at >= filter.from!)
  if (filter.to) leads = leads.filter((l) => l.created_at <= filter.to!)
  if (filter.search) {
    const q = filter.search.toLowerCase()
    leads = leads.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(filter.search!))
  }
  return delay(leads.sort((a, b) => b.created_at.localeCompare(a.created_at)))
}

export async function createLead(input: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>): Promise<CrmLead> {
  const s = read()
  const lead: CrmLead = { ...input, id: uid(), created_at: now(), updated_at: now() }
  s.leads.push(lead)
  s.history.push({ id: uid(), lead_id: lead.id, at: now(), actor_name: 'System', type: 'created', detail: 'Lead created' })
  write(s)
  return delay(lead)
}

/** Bulk import (from CSV/manual list). */
export async function importLeads(rows: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
  const s = read()
  for (const row of rows) {
    const lead: CrmLead = { ...row, id: uid(), created_at: now(), updated_at: now() }
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
