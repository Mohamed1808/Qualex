// This module contains assignment logic utilities
// The actual DB queries happen in actions/assignment.ts

export const TERMINAL_STAGES = [
  'qualified',
  'unqualified',
  'retired',
  'terminated',
  'unreachable',
  'approved',
  'rejected',
] as const

export const TELESALES_STAGES = [
  'new',
  'telesales_assigned',
  'telesales_in_progress',
] as const

export const DS_STAGES = [
  'ds_assigned',
  'ds_in_progress',
  'id_collected',
  'credit_submitted',
] as const

export type TerminalStage = (typeof TERMINAL_STAGES)[number]
export type TelesalesStage = (typeof TELESALES_STAGES)[number]
export type DSStage = (typeof DS_STAGES)[number]

export function isTerminalStage(stage: string): boolean {
  return TERMINAL_STAGES.includes(stage as TerminalStage)
}

export function isTelesalesStage(stage: string): boolean {
  return TELESALES_STAGES.includes(stage as TelesalesStage)
}

export function isDSStage(stage: string): boolean {
  return DS_STAGES.includes(stage as DSStage)
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    new: 'New',
    telesales_assigned: 'TS Assigned',
    telesales_in_progress: 'TS In Progress',
    qualified: 'Qualified',
    unqualified: 'Unqualified',
    ds_assigned: 'DS Assigned',
    ds_in_progress: 'DS In Progress',
    id_collected: 'ID Collected',
    credit_submitted: 'Credit Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    unreachable: 'Unreachable',
    retired: 'Retired',
    terminated: 'Terminated',
  }
  return labels[stage] ?? stage
}
