'use server'

import { createClient } from '@/lib/supabase/server'
import { addWorkingHours, SLA_TELESALES_HOURS, SLA_DS_HOURS } from '@/lib/sla'

/**
 * Auto-assign a lead to the best available agent.
 * Algorithm: pick the active, checked-in, not-on-break agent with the fewest active leads.
 */
export async function autoAssignLead(leadId: string) {
  const supabase = createClient()

  // Fetch the lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('stage, assigned_telesales_agent, assigned_direct_sales_agent')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) return { error: 'Lead not found' }

  const isDS = lead.stage === 'qualified'
  const teamRole = isDS ? 'direct_sales_agent' : 'telesales_agent'
  const today = new Date().toISOString().split('T')[0]

  // Get available agents (active, checked in, not on break)
  const { data: availableAgents } = await supabase
    .from('profiles')
    .select(`
      id,
      daily_attendance!inner(checked_in, checked_out, on_break, date)
    `)
    .eq('role', teamRole)
    .eq('is_active', true)
    .eq('is_on_break', false)
    .eq('daily_attendance.date', today)
    .eq('daily_attendance.checked_in', true)
    .eq('daily_attendance.checked_out', false)

  let agentPool = availableAgents ?? []

  if (agentPool.length === 0) {
    // Fallback: assign to any active agent on the team (ignore attendance)
    const { data: fallbackAgents } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', teamRole)
      .eq('is_active', true)

    if (!fallbackAgents || fallbackAgents.length === 0) {
      return { agentId: null, reason: 'No active agents on this team' }
    }
    agentPool = fallbackAgents
  }

  // Count active leads per agent
  const agentIds = agentPool.map((a) => a.id)
  const stageField = isDS ? 'assigned_direct_sales_agent' : 'assigned_telesales_agent'
  const activeStages = isDS
    ? ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted']
    : ['new', 'telesales_assigned', 'telesales_in_progress']

  const { data: leadCounts } = await supabase
    .from('leads')
    .select(stageField)
    .in(stageField, agentIds)
    .in('stage', activeStages)

  // Tally counts
  const counts: Record<string, number> = {}
  for (const a of agentIds) counts[a] = 0
  for (const l of leadCounts ?? []) {
    const agentId = (l as Record<string, string>)[stageField]
    if (agentId && counts[agentId] !== undefined) {
      counts[agentId]++
    }
  }

  // Pick agent with fewest leads
  const bestAgent = agentIds.reduce((best, id) => (counts[id] < counts[best] ? id : best))

  const now = new Date()
  const slaHours = isDS ? SLA_DS_HOURS : SLA_TELESALES_HOURS
  const slaDueAt = addWorkingHours(now, slaHours)

  const updates: Record<string, unknown> = {
    [stageField]: bestAgent,
  }

  if (isDS) {
    updates.stage = 'ds_assigned'
    updates.direct_sales_assigned_at = now.toISOString()
    updates.ds_sla_due_at = slaDueAt.toISOString()
  } else {
    updates.stage = 'telesales_assigned'
    updates.telesales_assigned_at = now.toISOString()
    updates.tele_sla_due_at = slaDueAt.toISOString()
  }

  const { error: updateError } = await supabase.from('leads').update(updates).eq('id', leadId)
  if (updateError) return { error: updateError.message }

  // Create notification for agent
  await supabase.from('notifications').insert({
    user_id: bestAgent,
    lead_id: leadId,
    type: 'new_lead_assigned',
    message: `A new lead has been assigned to you`,
  })

  return { agentId: bestAgent, reason: 'Assigned to least-loaded available agent' }
}

/**
 * Manual reassignment by supervisor
 */
export async function assignLeadToAgent(
  leadId: string,
  agentId: string,
  stage: 'telesales' | 'direct_sales'
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify requester is supervisor or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const allowedRoles = ['telesales_supervisor', 'direct_sales_supervisor', 'admin']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  const isDS = stage === 'direct_sales'
  const stageField = isDS ? 'assigned_direct_sales_agent' : 'assigned_telesales_agent'
  const newStage = isDS ? 'ds_assigned' : 'telesales_assigned'
  const now = new Date().toISOString()
  const slaHours = isDS ? SLA_DS_HOURS : SLA_TELESALES_HOURS
  const slaDueAt = addWorkingHours(new Date(), slaHours)

  const updates: Record<string, unknown> = {
    [stageField]: agentId,
    stage: newStage,
  }

  if (isDS) {
    updates.direct_sales_assigned_at = now
    updates.ds_sla_due_at = slaDueAt.toISOString()
  } else {
    updates.telesales_assigned_at = now
    updates.tele_sla_due_at = slaDueAt.toISOString()
  }

  const { data: oldLead } = await supabase
    .from('leads')
    .select('stage')
    .eq('id', leadId)
    .single()

  const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
  if (error) return { error: error.message }

  // Log history
  await supabase.from('lead_stage_history').insert({
    lead_id: leadId,
    from_stage: oldLead?.stage ?? null,
    to_stage: newStage,
    changed_by: user.id,
    note: `Manually reassigned to agent ${agentId}`,
  })

  // Notify agent
  await supabase.from('notifications').insert({
    user_id: agentId,
    lead_id: leadId,
    type: 'new_lead_assigned',
    message: 'A lead has been assigned to you by your supervisor',
  })

  return { success: true }
}
