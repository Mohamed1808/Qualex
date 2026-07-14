'use client'

/** Consistent colored pill used for stage, status, and role everywhere in the app. */
export function Pill({ label, color = '#6B7280', className = '' }: { label: string; color?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap capitalize ${className}`}
      style={{ color, backgroundColor: `${color}18` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

const STAGE_COLORS: Record<string, string> = {
  new: '#6B7280',
  telesales_assigned: '#5757e6',
  telesales_in_progress: '#5757e6',
  qualified: '#14B8A6',
  unqualified: '#F26161',
  ds_assigned: '#0EA5E9',
  ds_in_progress: '#0EA5E9',
  id_collected: '#8B5CF6',
  credit_submitted: '#F59E0B',
  approved: '#22C55E',
  rejected: '#F26161',
  unreachable: '#F26161',
  retired: '#6B7280',
  terminated: '#6B7280',
}

export function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? '#6B7280'
}

// "new" is the pipeline stage before anyone has touched the lead — shown as "Fresh"
// everywhere so it always matches the Fresh status chip instead of reading as a
// different, unrelated state.
export function stageLabel(stage: string): string {
  return stage === 'new' ? 'Fresh' : stage.replace(/_/g, ' ')
}

export function StagePill({ stage, className = '' }: { stage: string; className?: string }) {
  return <Pill label={stageLabel(stage)} color={stageColor(stage)} className={className} />
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#7C3AED',
  telesales_supervisor: '#5757e6',
  telesales_agent: '#0EA5E9',
  direct_sales_supervisor: '#14B8A6',
  direct_sales_agent: '#22C55E',
}

export function RolePill({ role, className = '' }: { role: string; className?: string }) {
  return <Pill label={role.replace(/_/g, ' ')} color={ROLE_COLORS[role] ?? '#6B7280'} className={className} />
}
