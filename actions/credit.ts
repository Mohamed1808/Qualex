'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Record a credit decision on a lead that has been submitted to credit.
 * Allowed for the credit team (admin) and direct sales supervisors.
 * Moves the lead from 'credit_submitted' to 'approved' or 'rejected',
 * logs history, and notifies the assigned direct sales agent.
 */
export async function recordCreditDecision(
  leadId: string,
  decision: 'approved' | 'rejected',
  note: string
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const allowedRoles = ['admin', 'direct_sales_supervisor']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('stage, name, assigned_direct_sales_agent')
    .eq('id', leadId)
    .single()

  if (fetchError || !lead) return { error: 'Lead not found' }
  if (lead.stage !== 'credit_submitted') {
    return { error: 'Lead is not awaiting a credit decision' }
  }

  const updates: Record<string, unknown> = {
    stage: decision,
    ds_disposition: decision === 'approved' ? 'qualified' : 'unqualified',
  }
  if (decision === 'rejected') {
    updates.unqualification_reason = note || 'Credit rejected'
  }
  if (note) updates.ds_notes = note

  const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
  if (error) return { error: error.message }

  // Log history
  await supabase.from('lead_stage_history').insert({
    lead_id: leadId,
    from_stage: 'credit_submitted',
    to_stage: decision,
    changed_by: user.id,
    note: `Credit ${decision}${note ? ` — ${note}` : ''}`,
  })

  // Notify the assigned DS agent of the outcome
  if (lead.assigned_direct_sales_agent) {
    await supabase.from('notifications').insert({
      user_id: lead.assigned_direct_sales_agent,
      lead_id: leadId,
      type: 'credit_decision',
      message: `Credit ${decision} for ${lead.name}`,
    })
  }

  return { success: true }
}
