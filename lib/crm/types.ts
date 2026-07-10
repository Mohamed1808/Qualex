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

// ---- Pipeline (Telesales → Direct Sales → Credit) ----
export type LeadStage =
  | 'new'
  | 'telesales_assigned'
  | 'telesales_in_progress'
  | 'qualified'
  | 'unqualified'
  | 'ds_assigned'
  | 'ds_in_progress'
  | 'id_collected'
  | 'credit_submitted'
  | 'approved'
  | 'rejected'
  | 'unreachable'
  | 'retired'
  | 'terminated'

export type Disposition = 'qualified' | 'unqualified' | 'no_answer' | 'terminated' | 'retired'
export type FinancingProgram = 'new_car' | 'used_car' | 'collateral'
export type CarSource = 'dealer' | 'individual_c2c' | 'undecided'

export interface CrmLead {
  id: string
  name: string
  phone: string
  facebook_url: string | null
  channel: LeadChannel
  project_id: string | null
  status_id: string | null // dynamic sub-status / disposition chip
  // active owner in the CURRENT stage (TS agent, then DS agent)
  assigned_user_id: string | null
  created_at: string
  updated_at: string
  expire_note: string | null

  // pipeline
  stage: LeadStage
  assigned_telesales_agent: string | null
  assigned_direct_sales_agent: string | null
  tele_disposition: Disposition | null
  ds_disposition: Disposition | null
  telesales_qualified_at: string | null
  direct_sales_assigned_at: string | null

  // SLA
  tele_sla_due_at: string | null
  tele_sla_breached: boolean
  ds_sla_due_at: string | null
  ds_sla_breached: boolean

  // qualification (captured by telesales, used by DS + credit)
  salary_bracket: string | null
  down_payment_bracket: string | null
  financing_program: FinancingProgram | null
  car_source: CarSource | null
  knows_specific_car: boolean | null
  occupation: string | null
  customer_national_id: string | null
  requested_car_brand: string | null
  requested_car_year: number | null
  id_document_url: string | null
  unqualification_reason: string | null

  // duplicate detection
  is_duplicate: boolean
  duplicate_of: string | null
}

export type CallStage = 'telesales' | 'direct_sales'
export type CallOutcome = 'answered' | 'no_answer' | 'callback_scheduled'

export interface CallAttempt {
  id: string
  lead_id: string
  agent_id: string
  agent_name: string
  stage: CallStage
  attempt_number: number
  outcome: CallOutcome
  callback_at: string | null
  notes: string | null
  called_at: string
}

export interface BreakLogEntry {
  started_at: string
  ended_at: string | null
}

export interface Attendance {
  user_id: string
  date: string // YYYY-MM-DD
  checked_in: boolean
  checked_in_at: string | null
  checked_out: boolean
  checked_out_at: string | null
  on_break: boolean
  break_log: BreakLogEntry[]
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
