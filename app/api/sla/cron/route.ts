import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Validate cron secret
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const nowISO = now.toISOString()

  let slaBreachCount = 0
  let callbackNotifCount = 0

  // --- Telesales SLA breaches ---
  const { data: teleBreached } = await supabase
    .from('leads')
    .select('id, assigned_telesales_agent, tele_sla_due_at')
    .eq('tele_sla_breached', false)
    .not('tele_sla_due_at', 'is', null)
    .lt('tele_sla_due_at', nowISO)
    .in('stage', ['new', 'telesales_assigned', 'telesales_in_progress'])

  if (teleBreached && teleBreached.length > 0) {
    const teleIds = teleBreached.map((l) => l.id)

    await supabase
      .from('leads')
      .update({ tele_sla_breached: true })
      .in('id', teleIds)

    slaBreachCount += teleIds.length

    // Find supervisors for notifications
    const { data: supervisors } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'telesales_supervisor')
      .eq('is_active', true)

    const supervisorIds = supervisors?.map((s) => s.id) ?? []

    const breachNotifs = []
    for (const lead of teleBreached) {
      // Notify agent
      if (lead.assigned_telesales_agent) {
        breachNotifs.push({
          user_id: lead.assigned_telesales_agent,
          lead_id: lead.id,
          type: 'sla_breach' as const,
          message: 'SLA breached on your lead',
        })
      }
      // Notify supervisors
      for (const supId of supervisorIds) {
        breachNotifs.push({
          user_id: supId,
          lead_id: lead.id,
          type: 'sla_breach' as const,
          message: 'Telesales SLA breached on a lead',
        })
      }
    }

    if (breachNotifs.length > 0) {
      await supabase.from('notifications').insert(breachNotifs)
    }
  }

  // --- DS SLA breaches ---
  const { data: dsBreached } = await supabase
    .from('leads')
    .select('id, assigned_direct_sales_agent, ds_sla_due_at')
    .eq('ds_sla_breached', false)
    .not('ds_sla_due_at', 'is', null)
    .lt('ds_sla_due_at', nowISO)
    .in('stage', ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'])

  if (dsBreached && dsBreached.length > 0) {
    const dsIds = dsBreached.map((l) => l.id)

    await supabase
      .from('leads')
      .update({ ds_sla_breached: true })
      .in('id', dsIds)

    slaBreachCount += dsIds.length

    const { data: dsSupervisors } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'direct_sales_supervisor')
      .eq('is_active', true)

    const dsSupervisorIds = dsSupervisors?.map((s) => s.id) ?? []

    const dsBreachNotifs = []
    for (const lead of dsBreached) {
      if (lead.assigned_direct_sales_agent) {
        dsBreachNotifs.push({
          user_id: lead.assigned_direct_sales_agent,
          lead_id: lead.id,
          type: 'sla_breach' as const,
          message: 'DS SLA breached on your lead',
        })
      }
      for (const supId of dsSupervisorIds) {
        dsBreachNotifs.push({
          user_id: supId,
          lead_id: lead.id,
          type: 'sla_breach' as const,
          message: 'Direct Sales SLA breached on a lead',
        })
      }
    }

    if (dsBreachNotifs.length > 0) {
      await supabase.from('notifications').insert(dsBreachNotifs)
    }
  }

  // --- SLA warnings (10 minutes before breach) ---
  const warningCutoff = new Date(now.getTime() + 10 * 60 * 1000).toISOString()

  const { data: teleWarning } = await supabase
    .from('leads')
    .select('id, assigned_telesales_agent')
    .eq('tele_sla_breached', false)
    .not('tele_sla_due_at', 'is', null)
    .gte('tele_sla_due_at', nowISO)
    .lte('tele_sla_due_at', warningCutoff)
    .in('stage', ['new', 'telesales_assigned', 'telesales_in_progress'])

  if (teleWarning && teleWarning.length > 0) {
    const warnNotifs = teleWarning
      .filter((l) => l.assigned_telesales_agent)
      .map((l) => ({
        user_id: l.assigned_telesales_agent!,
        lead_id: l.id,
        type: 'sla_warning' as const,
        message: 'SLA will breach in 10 minutes on your lead',
      }))
    if (warnNotifs.length > 0) {
      await supabase.from('notifications').insert(warnNotifs)
    }
  }

  // --- Callback due notifications ---
  const callbackWindow = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

  const { data: teleCallbacks } = await supabase
    .from('call_attempts')
    .select('id, lead_id, agent_id, callback_at')
    .eq('outcome', 'callback_scheduled')
    .not('callback_at', 'is', null)
    .gte('callback_at', nowISO)
    .lte('callback_at', callbackWindow)

  if (teleCallbacks && teleCallbacks.length > 0) {
    callbackNotifCount += teleCallbacks.length
    const callbackNotifs = teleCallbacks.map((c) => ({
      user_id: c.agent_id,
      lead_id: c.lead_id,
      type: 'callback_due' as const,
      message: 'A scheduled callback is due in 15 minutes',
    }))
    await supabase.from('notifications').insert(callbackNotifs)
  }

  return NextResponse.json({
    success: true,
    timestamp: nowISO,
    sla_breaches_processed: slaBreachCount,
    callback_notifications_sent: callbackNotifCount,
  })
}
