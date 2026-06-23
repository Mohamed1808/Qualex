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

export type LeadChannel = 'whatsapp' | 'meta' | 'website' | 'app' | 'call_center'

export type UserRole =
  | 'telesales_agent'
  | 'telesales_supervisor'
  | 'direct_sales_agent'
  | 'direct_sales_supervisor'
  | 'admin'

export type TeleDisposition = 'qualified' | 'unqualified' | 'no_answer' | 'terminated' | 'retired'
export type DSDisposition = 'qualified' | 'unqualified' | 'no_answer' | 'terminated' | 'retired'

export type NotificationType =
  | 'new_lead_assigned'
  | 'sla_warning'
  | 'sla_breach'
  | 'duplicate_detected'
  | 'callback_due'
  | 'new_lead_unassigned'
  | 'lead_qualified'
  | 'credit_decision'

export type CallOutcome = 'answered' | 'no_answer' | 'callback_scheduled'
export type CallStage = 'telesales' | 'direct_sales'

export interface ChannelHistoryEntry {
  channel: LeadChannel
  captured_at: string
  source: string | null
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  team: 'telesales' | 'direct_sales' | null
  is_active: boolean
  is_on_break: boolean
  break_started_at: string | null
  shift_start: string
  shift_end: string
}

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  name: string
  phone: string
  phone_normalized: string | null
  channel: LeadChannel
  requested_car_brand: string | null
  requested_car_year: number | null
  source_campaign: string | null
  is_duplicate: boolean
  duplicate_of: string | null
  channel_history: ChannelHistoryEntry[]
  assigned_telesales_agent: string | null
  assigned_direct_sales_agent: string | null
  telesales_assigned_at: string | null
  telesales_qualified_at: string | null
  direct_sales_assigned_at: string | null
  stage: LeadStage
  customer_national_id: string | null
  salary_bracket: string | null
  down_payment_bracket: string | null
  financing_program: 'new_car' | 'used_car' | 'collateral' | null
  car_source: 'dealer' | 'individual_c2c' | 'undecided' | null
  knows_specific_car: boolean | null
  occupation: string | null
  customer_id_reference: string | null
  tele_disposition: TeleDisposition | null
  ds_disposition: DSDisposition | null
  tele_sla_due_at: string | null
  tele_sla_breached: boolean
  ds_sla_due_at: string | null
  ds_sla_breached: boolean
  tele_follow_up_at: string | null
  ds_follow_up_at: string | null
  id_document_url: string | null
  tele_notes: string | null
  ds_notes: string | null
  unqualification_reason: string | null
  profiles_telesales?: Profile
  profiles_direct_sales?: Profile
}

export interface CallAttempt {
  id: string
  lead_id: string
  agent_id: string
  stage: CallStage
  attempt_number: number
  called_at: string
  outcome: CallOutcome
  callback_at: string | null
  agent_confirmed_call: boolean
  notes: string | null
}

export interface BreakLogEntry {
  started_at: string
  ended_at: string | null
}

export interface DailyAttendance {
  id: string
  agent_id: string
  date: string
  checked_in: boolean
  checked_in_at: string | null
  checked_out: boolean
  checked_out_at: string | null
  on_break: boolean
  break_log: BreakLogEntry[]
}

export interface Notification {
  id: string
  user_id: string
  lead_id: string | null
  type: NotificationType
  message: string
  is_read: boolean
  created_at: string
}

export interface ScriptFeedback {
  id: string
  lead_id: string
  feedback_stage: 'tele_qa' | 'ds_override' | 'credit_rejection'
  submitted_by: string
  reason_code: string
  reason_detail: string
  created_at: string
}

export interface ConfigOccupation {
  id: string
  label: string
  sort_order: number
  is_active: boolean
}

export interface LeadStageHistory {
  id: string
  lead_id: string
  from_stage: LeadStage | null
  to_stage: LeadStage
  changed_by: string | null
  changed_at: string
  note: string | null
}

// Qualification form data
export interface QualificationData {
  salary_bracket: string
  down_payment_bracket: string
  financing_program: 'new_car' | 'used_car' | 'collateral'
  car_source: 'dealer' | 'individual_c2c' | 'undecided'
  knows_specific_car: boolean
  occupation: string
  customer_national_id?: string
  tele_notes?: string
}

// Assignment result
export interface AssignmentResult {
  agentId: string | null
  reason: string
}
