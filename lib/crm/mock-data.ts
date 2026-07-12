// ============================================================================
// CRM v2 — mock seed data (frontend-only)
// The backend developer replaces the service layer (service.ts); this seed is
// only used to make the UI feel alive during demos.
// ============================================================================

import type {
  LeadStatus,
  Project,
  Team,
  CrmUser,
  CrmLead,
  LeadComment,
  LeadReminder,
  DistributionSchedule,
  LeadChannel,
  LeadStage,
} from './types'

export const SEED_STATUSES: LeadStatus[] = [
  { id: 'st-fresh', name: 'Fresh', color: '#5757e6', sort_order: 1, category: 'open', is_default: true, is_active: true },
  { id: 'st-notreached', name: 'Not Yet Reached', color: '#6B7280', sort_order: 2, category: 'open', is_default: false, is_active: true },
  { id: 'st-noanswer', name: 'No Answer', color: '#F59E0B', sort_order: 3, category: 'open', is_default: false, is_active: true },
  { id: 'st-followup', name: 'Follow Up', color: '#3B82F6', sort_order: 4, category: 'open', is_default: false, is_active: true },
  { id: 'st-meeting', name: 'Meeting', color: '#14B8A6', sort_order: 5, category: 'open', is_default: false, is_active: true },
  { id: 'st-meetingfu', name: 'Meeting Follow Up', color: '#0EA5E9', sort_order: 6, category: 'open', is_default: false, is_active: true },
  { id: 'st-waiting', name: 'Waiting', color: '#A855F7', sort_order: 7, category: 'open', is_default: false, is_active: true },
  { id: 'st-request', name: 'Request', color: '#8B5CF6', sort_order: 8, category: 'open', is_default: false, is_active: true },
  { id: 'st-owner', name: 'Owner', color: '#EC4899', sort_order: 9, category: 'open', is_default: false, is_active: true },
  { id: 'st-junk', name: 'Junk', color: '#6B7280', sort_order: 10, category: 'lost', is_default: false, is_active: true },
  { id: 'st-ongoing', name: 'On going Deal', color: '#F59E0B', sort_order: 11, category: 'open', is_default: false, is_active: true },
  { id: 'st-completed', name: 'Completed Deal', color: '#22C55E', sort_order: 12, category: 'won', is_default: false, is_active: true },
  { id: 'st-wasent', name: '(WA) Sent', color: '#25D366', sort_order: 13, category: 'open', is_default: false, is_active: true },
  { id: 'st-warecv', name: '(WA) Recv', color: '#128C7E', sort_order: 14, category: 'open', is_default: false, is_active: true },
  { id: 'st-notinterested', name: 'Not interested', color: '#F26161', sort_order: 15, category: 'lost', is_default: false, is_active: true },
]

export const SEED_PROJECTS: Project[] = [
  {
    id: 'pr-alex',
    name: 'Alexandria',
    description: 'Coastal residential project in Alexandria.',
    is_active: true,
    created_at: '2024-01-10T09:00:00Z',
    details: [
      { title: 'General Details', body: 'A distinctive project at KM 22, paved roads with gates on the International Coastal Road. Varied areas — villas, apartments, a club and a school, occupied since 2014.' },
      { title: 'Developer & Track Record', body: 'Delivered multiple residential communities across the North Coast.' },
      { title: 'Location & Area', body: 'KM 22, North Coast — direct access to the International Coastal Road.' },
      { title: 'Services & Delivery Date', body: 'Club, school, retail. Ready to move.' },
      { title: 'Unit Types & Payment Plans', body: 'Villas, apartments. Up to 7-year installments.' },
      { title: 'Finishing & Load Ratio', body: 'Fully finished / semi-finished options.' },
      { title: 'Selling Points & Drawbacks', body: 'Prime location, established community.' },
    ],
  },
  { id: 'pr-palmhills', name: 'Palmhills (Alexandria)', description: 'Palm Hills development in Alexandria.', is_active: true, created_at: '2024-02-01T09:00:00Z', details: [{ title: 'General Details', body: 'Premium gated community by Palm Hills.' }] },
  { id: 'pr-illatini', name: 'IL Latini New Alamein', description: 'IL Latini, New Alamein.', is_active: true, created_at: '2024-03-01T09:00:00Z', details: [{ title: 'General Details', body: 'Beachfront towers in New Alamein.' }] },
  { id: 'pr-ras', name: 'Ras El7ekma', description: 'Ras El Hekma coastal project.', is_active: true, created_at: '2024-03-15T09:00:00Z', details: [{ title: 'General Details', body: 'New Ras El Hekma destination.' }] },
  { id: 'pr-cold', name: 'cold', description: 'General cold-lead pool.', is_active: false, created_at: '2024-01-01T09:00:00Z', details: [] },
]

export const SEED_TEAMS: Team[] = [
  { id: 'tm-alex', name: 'Alexandria Team', leader_id: 'u-sara', created_at: '2024-01-05T09:00:00Z' },
  { id: 'tm-coast', name: 'North Coast Team', leader_id: 'u-nour', created_at: '2024-01-05T09:00:00Z' },
]

export const SEED_USERS: CrmUser[] = [
  { id: 'u-admin', full_name: 'Mohamed Moheb', email: 'mmoheb.2002@gmail.com', role: 'admin', title: 'Administrator', team_id: null, is_active: true, created_at: '2024-01-01T09:00:00Z', history: [{ at: '2024-01-01T09:00:00Z', action: 'Account created' }] },
  { id: 'u-sara', full_name: 'Sara Mahmoud', email: 'sara@drivefinance.eg', role: 'telesales_supervisor', title: 'Telesales Supervisor', team_id: 'tm-alex', is_active: true, created_at: '2024-01-02T09:00:00Z', history: [{ at: '2024-01-02T09:00:00Z', action: 'Account created' }] },
  { id: 'u-ahmed', full_name: 'Ahmed Hassan', email: 'ahmed@drivefinance.eg', role: 'telesales_agent', title: 'Sales Agent', team_id: 'tm-alex', is_active: true, created_at: '2024-01-03T09:00:00Z', history: [{ at: '2024-01-03T09:00:00Z', action: 'Account created' }] },
  { id: 'u-bahr', full_name: 'Mohamed Bahr', email: 'bahr@drivefinance.eg', role: 'telesales_agent', title: 'Sales Agent', team_id: 'tm-alex', is_active: true, created_at: '2024-01-04T09:00:00Z', history: [{ at: '2024-01-04T09:00:00Z', action: 'Account created' }] },
  { id: 'u-nour', full_name: 'Nour Ibrahim', email: 'nour@drivefinance.eg', role: 'direct_sales_supervisor', title: 'DS Supervisor', team_id: 'tm-coast', is_active: true, created_at: '2024-01-05T09:00:00Z', history: [{ at: '2024-01-05T09:00:00Z', action: 'Account created' }] },
  { id: 'u-omar', full_name: 'Omar Khaled', email: 'omar@drivefinance.eg', role: 'direct_sales_agent', title: 'Sales Agent', team_id: 'tm-coast', is_active: true, created_at: '2024-01-06T09:00:00Z', history: [{ at: '2024-01-06T09:00:00Z', action: 'Account created' }] },
]

const NAMES = ['Khaled Adel', 'Mona Sherif', 'Tarek Fouad', 'Yasmin Saad', 'Hossam Gamal', 'Dina Magdy', 'Sherif Nabil', 'Amira Lotfi', 'Walid Samir', 'Rania Adel', 'Ahmed Sobhy', 'Heba Kamal', 'Mostafa Ezz', 'Laila Hany', 'Omar Fathy', 'Salma Reda', 'Karim Wael', 'Nada Sami', 'Tamer Ashraf', 'Ghada Nasr']
const CHANNELS: LeadChannel[] = ['call_center', 'facebook', 'instagram', 'website', 'app', 'whatsapp', 'walkin']
export const SEED_CAMPAIGNS = ['Summer 2025', 'Ramadan Offer', 'North Coast Push', 'Retargeting Q3', 'New Alamein Launch']
const STATUS_IDS = SEED_STATUSES.map((s) => s.id)
const PROJECT_IDS = SEED_PROJECTS.map((p) => p.id)
const TS_AGENTS = ['u-ahmed', 'u-bahr']

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString()
}

const STAGE_PLAN: LeadStage[] = [
  'new', 'telesales_assigned', 'telesales_in_progress', 'qualified', 'ds_assigned',
  'ds_in_progress', 'id_collected', 'credit_submitted', 'approved', 'rejected',
  'unqualified', 'unreachable', 'new', 'telesales_assigned', 'qualified',
  'ds_assigned', 'id_collected', 'approved', 'telesales_in_progress', 'new',
]

const DS_STAGES: LeadStage[] = ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted']
const QUALIFIED_PLUS: LeadStage[] = ['qualified', ...DS_STAGES, 'approved', 'rejected']

/** Build a fully-populated lead with pipeline defaults. */
export function makeLead(partial: Partial<CrmLead> & { name: string; phone: string }): CrmLead {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2, 10),
    facebook_url: null, channel: 'call_center', campaign: null, project_id: null, status_id: null,
    assigned_user_id: null, expire_note: null,
    stage: 'new', assigned_telesales_agent: null, assigned_direct_sales_agent: null,
    tele_disposition: null, ds_disposition: null, telesales_qualified_at: null, direct_sales_assigned_at: null,
    tele_sla_due_at: null, tele_sla_breached: false, ds_sla_due_at: null, ds_sla_breached: false,
    salary_bracket: null, down_payment_bracket: null, financing_program: null, car_source: null,
    knows_specific_car: null, occupation: null, customer_national_id: null,
    requested_car_brand: null, requested_car_model: null, requested_car_year: null,
    expected_program: null, id_document_url: null, unqualification_reason: null,
    next_callback_at: null, callback_locked: false,
    is_duplicate: false, duplicate_of: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...partial,
  }
}

export const SEED_LEADS: CrmLead[] = NAMES.map((name, i) => {
  const stage = STAGE_PLAN[i % STAGE_PLAN.length]
  const tsAgent = TS_AGENTS[i % TS_AGENTS.length]
  const inDS = DS_STAGES.includes(stage)
  const dsTouched = inDS || stage === 'approved' || stage === 'rejected'
  const qualified = QUALIFIED_PLUS.includes(stage)
  const owner = dsTouched ? 'u-omar' : stage === 'new' ? null : tsAgent

  return makeLead({
    id: `ld-${i + 1}`,
    name,
    phone: `0127${String(6660000 + i * 37).padStart(7, '0')}`,
    facebook_url: i % 3 === 0 ? `https://facebook.com/${name.split(' ')[0].toLowerCase()}` : null,
    channel: CHANNELS[i % CHANNELS.length],
    campaign: SEED_CAMPAIGNS[i % SEED_CAMPAIGNS.length],
    project_id: PROJECT_IDS[i % PROJECT_IDS.length],
    status_id: STATUS_IDS[i % STATUS_IDS.length],
    assigned_user_id: owner,
    stage,
    assigned_telesales_agent: stage === 'new' ? null : tsAgent,
    assigned_direct_sales_agent: dsTouched ? 'u-omar' : null,
    tele_disposition: qualified ? 'qualified' : stage === 'unqualified' ? 'unqualified' : stage === 'unreachable' ? 'no_answer' : null,
    ds_disposition: stage === 'approved' ? 'qualified' : stage === 'rejected' ? 'unqualified' : null,
    telesales_qualified_at: qualified ? daysAgo(i) : null,
    direct_sales_assigned_at: dsTouched ? daysAgo(i > 1 ? i - 1 : 0) : null,
    tele_sla_due_at: ['telesales_assigned', 'telesales_in_progress'].includes(stage) ? hoursFromNow(i % 3 === 0 ? -2 : 3) : null,
    tele_sla_breached: stage === 'telesales_in_progress' && i % 3 === 0,
    ds_sla_due_at: inDS ? hoursFromNow(i % 4 === 0 ? -1 : 6) : null,
    ds_sla_breached: inDS && i % 4 === 0,
    salary_bracket: qualified ? ['10000_20000', '20000_plus', '5000_10000'][i % 3] : null,
    down_payment_bracket: qualified ? ['20_30pct', '30_50pct'][i % 2] : null,
    financing_program: qualified ? (['new_car', 'used_car', 'collateral'] as const)[i % 3] : null,
    car_source: qualified ? (['dealer', 'individual', 'distributor'] as const)[i % 3] : null,
    occupation: qualified ? ['Engineer', 'Doctor', 'Accountant', 'Teacher'][i % 4] : null,
    customer_national_id: qualified ? `2${String(88010100000 + i * 137).slice(0, 13)}` : null,
    requested_car_brand: ['Toyota', 'Hyundai', 'Kia', 'Nissan'][i % 4],
    requested_car_model: ['Corolla', 'Tucson', 'Sportage', 'Sunny'][i % 4],
    requested_car_year: 2022 + (i % 3),
    expected_program: inDS ? (['D2', 'D3', 'U2', 'U4', 'LC1', 'LC5'] as const)[i % 6] : null,
    unqualification_reason: stage === 'unqualified' ? 'Income below threshold' : stage === 'rejected' ? 'Credit rejected by bank' : null,
    created_at: daysAgo(i),
    updated_at: daysAgo(i > 3 ? i - 2 : 0),
    expire_note: i % 5 === 0 ? 'You Locked It' : null,
  })
})

// build an ISO timestamp for HH:MM today
function todayAt(h: number, m: number): string {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
const TODAY = new Date().toISOString().slice(0, 10)

export const SEED_ATTENDANCE: import('./types').Attendance[] = [
  // Ahmed — checked in, took a short break, currently on a second break
  {
    user_id: 'u-ahmed', date: TODAY, checked_in: true, checked_in_at: todayAt(9, 3),
    checked_out: false, checked_out_at: null, on_break: true,
    break_log: [
      { started_at: todayAt(11, 0), ended_at: todayAt(11, 22) },
      { started_at: todayAt(14, 5), ended_at: null },
    ],
  },
  // Bahr — not checked in yet
  {
    user_id: 'u-bahr', date: TODAY, checked_in: false, checked_in_at: null,
    checked_out: false, checked_out_at: null, on_break: false, break_log: [],
  },
  // Omar — full day, breaks exceeded 1 hour (triggers the alert), checked out
  {
    user_id: 'u-omar', date: TODAY, checked_in: true, checked_in_at: todayAt(9, 30),
    checked_out: true, checked_out_at: todayAt(18, 0), on_break: false,
    break_log: [
      { started_at: todayAt(12, 0), ended_at: todayAt(12, 35) },
      { started_at: todayAt(15, 0), ended_at: todayAt(15, 40) },
    ],
  },
]

export const SEED_CALL_ATTEMPTS: import('./types').CallAttempt[] = [
  { id: 'ca-1', lead_id: 'ld-3', agent_id: 'u-ahmed', agent_name: 'Ahmed Hassan', stage: 'telesales', attempt_number: 1, outcome: 'no_answer', answered_category: null, callback_at: null, notes: 'No answer, will retry', called_at: daysAgo(1) },
]

export const SEED_COMMENTS: LeadComment[] = [
  { id: 'cm-1', lead_id: 'ld-1', author_id: 'u-ahmed', author_name: 'Ahmed Hassan', body: 'Called the customer, interested in Alexandria villas. Asked to call back next week.', created_at: daysAgo(2) },
  { id: 'cm-2', lead_id: 'ld-1', author_id: 'u-ahmed', author_name: 'Ahmed Hassan', body: 'Sent project brochure over WhatsApp.', created_at: daysAgo(1) },
  { id: 'cm-3', lead_id: 'ld-2', author_id: 'u-bahr', author_name: 'Mohamed Bahr', body: 'No answer on first attempt.', created_at: daysAgo(1) },
]

export const SEED_REMINDERS: LeadReminder[] = []

export const SEED_DISTRIBUTIONS: DistributionSchedule[] = [
  { id: 'ds-1', name: 'Daily cold-pool top-up', project_id: 'pr-cold', source_status_id: 'st-fresh', per_user_count: 20, cadence: 'daily', target_user_ids: ['u-ahmed', 'u-bahr'], is_active: true, last_run_at: null, created_at: daysAgo(5) },
]

// The company's single unified WhatsApp number shown in the chat header
export const COMPANY_WHATSAPP_NUMBER = '+20 100 000 0000'
