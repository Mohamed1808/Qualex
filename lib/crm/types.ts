// ============================================================================
// CRM v2 — shared types
// Frontend-only build. These model the data the backend developer will expose.
// ============================================================================

export type StatusCategory = 'open' | 'won' | 'lost'

export interface LeadStatus {
  id: string
  name: string
  color: string // hex
  sort_order: number
  category: StatusCategory
  is_default: boolean
  is_active: boolean
}

export interface ProjectDetailSection {
  title: string
  body: string
}

export interface Project {
  id: string
  name: string
  description: string
  details: ProjectDetailSection[]
  is_active: boolean
  created_at: string
}

export interface Team {
  id: string
  name: string
  leader_id: string | null
  created_at: string
}

export type UserRole =
  | 'admin'
  | 'telesales_supervisor'
  | 'telesales_agent'
  | 'direct_sales_supervisor'
  | 'direct_sales_agent'

export interface CrmUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  title: string | null
  team_id: string | null
  is_active: boolean
  created_at: string
  // lightweight activity history
  history: UserHistoryEntry[]
}

export interface UserHistoryEntry {
  at: string
  action: string
}

export type LeadChannel = 'whatsapp' | 'meta' | 'website' | 'app' | 'call_center'

export interface LeadComment {
  id: string
  lead_id: string
  author_id: string
  author_name: string
  body: string
  created_at: string
}

export interface LeadHistoryEntry {
  id: string
  lead_id: string
  at: string
  actor_name: string
  type: 'status_change' | 'assignment' | 'comment' | 'contact' | 'created'
  detail: string
}

export interface CrmLead {
  id: string
  name: string
  phone: string
  facebook_url: string | null
  channel: LeadChannel
  project_id: string | null
  status_id: string | null
  assigned_user_id: string | null
  created_at: string
  updated_at: string
  expire_note: string | null // e.g. "You Locked It"
}

export interface LeadReminder {
  id: string
  user_id: string
  lead_id: string
  remind_at: string
  note: string | null
  is_sent: boolean
}

export type Cadence = 'once' | 'hourly' | 'daily'

export interface DistributionSchedule {
  id: string
  name: string
  project_id: string | null
  source_status_id: string | null
  per_user_count: number
  cadence: Cadence
  target_user_ids: string[]
  is_active: boolean
  last_run_at: string | null
  created_at: string
}

// A single unified-WhatsApp conversation (company number <-> customer)
export interface WhatsAppMessage {
  id: string
  lead_id: string
  direction: 'in' | 'out'
  body: string
  at: string
}

export interface LeadFilter {
  from?: string // ISO date
  to?: string // ISO date
  status_id?: string
  project_id?: string
  assigned_user_id?: string
  search?: string
}
