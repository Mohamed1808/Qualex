import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeEgyptianPhone } from '@/lib/phone'
import { addWorkingHours, SLA_TELESALES_HOURS } from '@/lib/sla'
import type { LeadChannel } from '@/types/database'

interface IntakePayload {
  name: string
  phone: string
  channel: LeadChannel
  requested_car_brand?: string
  requested_car_year?: number
  source_campaign?: string
}

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.INTAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: IntakePayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!payload.name || !payload.phone || !payload.channel) {
    return NextResponse.json(
      { error: 'Missing required fields: name, phone, channel' },
      { status: 400 }
    )
  }

  const validChannels: LeadChannel[] = ['whatsapp', 'meta', 'website', 'app', 'call_center']
  if (!validChannels.includes(payload.channel)) {
    return NextResponse.json(
      { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const phoneNormalized = normalizeEgyptianPhone(payload.phone)
  const slaDueAt = addWorkingHours(new Date(), SLA_TELESALES_HOURS)

  // Insert lead (trigger will handle dedup)
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      name: payload.name,
      phone: payload.phone,
      phone_normalized: phoneNormalized,
      channel: payload.channel,
      requested_car_brand: payload.requested_car_brand ?? null,
      requested_car_year: payload.requested_car_year ?? null,
      source_campaign: payload.source_campaign ?? null,
      tele_sla_due_at: slaDueAt.toISOString(),
      stage: 'new',
    })
    .select()
    .single()

  if (error) {
    console.error('Lead intake error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (lead.is_duplicate) {
    return NextResponse.json(
      {
        status: 'duplicate',
        message: 'Lead already exists with this phone number',
        lead_id: lead.id,
        original_lead_id: lead.duplicate_of,
      },
      { status: 200 }
    )
  }

  // Auto-assign: find least-loaded available telesales agent
  await autoAssignNewLead(supabase, lead.id)

  // Log stage history
  await supabase.from('lead_stage_history').insert({
    lead_id: lead.id,
    from_stage: null,
    to_stage: 'new',
    changed_by: null,
    note: `Lead captured via webhook (${payload.channel})`,
  })

  return NextResponse.json(
    {
      status: 'created',
      lead_id: lead.id,
      is_duplicate: false,
    },
    { status: 201 }
  )
}

async function autoAssignNewLead(
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string
) {
  const today = new Date().toISOString().split('T')[0]

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, daily_attendance!inner(checked_in, checked_out, on_break, date)')
    .eq('role', 'telesales_agent')
    .eq('is_active', true)
    .eq('is_on_break', false)
    .eq('daily_attendance.date', today)
    .eq('daily_attendance.checked_in', true)
    .eq('daily_attendance.checked_out', false)

  if (!agents || agents.length === 0) return

  const agentIds = agents.map((a) => a.id)

  const { data: activeCounts } = await supabase
    .from('leads')
    .select('assigned_telesales_agent')
    .in('assigned_telesales_agent', agentIds)
    .in('stage', ['new', 'telesales_assigned', 'telesales_in_progress'])

  const counts: Record<string, number> = {}
  for (const id of agentIds) counts[id] = 0
  for (const l of activeCounts ?? []) {
    if (l.assigned_telesales_agent) counts[l.assigned_telesales_agent]++
  }

  const bestAgent = agentIds.reduce((best, id) => (counts[id] < counts[best] ? id : best))
  const { addWorkingHours: awh, SLA_TELESALES_HOURS: slah } = await import('@/lib/sla')
  const slaDueAt = awh(new Date(), slah)

  await supabase
    .from('leads')
    .update({
      assigned_telesales_agent: bestAgent,
      stage: 'telesales_assigned',
      telesales_assigned_at: new Date().toISOString(),
      tele_sla_due_at: slaDueAt.toISOString(),
    })
    .eq('id', leadId)

  await supabase.from('notifications').insert({
    user_id: bestAgent,
    lead_id: leadId,
    type: 'new_lead_assigned',
    message: 'A new lead has been assigned to you',
  })
}
