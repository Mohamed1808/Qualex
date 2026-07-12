import type { LeadChannel, AnsweredCategory, ExpectedProgram, CarSource } from './types'

export const CHANNELS: LeadChannel[] = [
  'call_center', 'facebook', 'instagram', 'website', 'app', 'whatsapp', 'walkin',
]

export const CHANNEL_LABELS: Record<LeadChannel, string> = {
  call_center: 'Call Center',
  facebook: 'Facebook',
  instagram: 'Instagram',
  website: 'Website',
  app: 'Application',
  whatsapp: 'WhatsApp',
  walkin: 'Walk-in',
}

export const CHANNEL_COLORS: Record<LeadChannel, string> = {
  call_center: '#6B7280',
  facebook: '#1877F2',
  instagram: '#E1306C',
  website: '#0EA5E9',
  app: '#8B5CF6',
  whatsapp: '#25D366',
  walkin: '#F59E0B',
}

export const ANSWERED_CATEGORIES: { value: AnsweredCategory; label: string }[] = [
  { value: 'pending_id', label: 'Pending ID' },
  { value: 'inquiry_only', label: 'Inquiry only' },
  { value: 'high_interest', label: 'High interest rate' },
  { value: 'follow_up_needed', label: 'Follow up needed' },
  { value: 'specific_call_back_time', label: 'Specific call back time' },
]

export const EXPECTED_PROGRAMS: ExpectedProgram[] = ['D2', 'D3', 'U2', 'U4', 'LC1', 'LC5']

export const VEHICLE_SOURCES: { value: CarSource; label: string }[] = [
  { value: 'dealer', label: 'Car Dealer' },
  { value: 'individual', label: 'Individual' },
  { value: 'distributor', label: 'Car Distributor' },
  { value: 'undecided', label: 'Undecided' },
]

export const SALARY_BRACKETS = [
  { value: 'below_3000', label: '< 3,000' },
  { value: '3000_5000', label: '3,000–5,000' },
  { value: '5000_10000', label: '5,000–10,000' },
  { value: '10000_20000', label: '10,000–20,000' },
  { value: '20000_plus', label: '20,000+' },
]

export const DOWN_PAYMENT_BRACKETS = [
  { value: 'below_20pct', label: '< 20%' },
  { value: '20_30pct', label: '20–30%' },
  { value: '30_50pct', label: '30–50%' },
  { value: 'above_50pct', label: '> 50%' },
]

// Auto-callback intervals after consecutive no-answers (minutes).
export const CALLBACK_INTERVALS_MIN = [30, 60, 24 * 60]
