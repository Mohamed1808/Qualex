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

  // Supervisor-driven model: the lead stays unassigned (stage 'new') in the
  // Telesales Supervisor queue. Notify all active telesales supervisors.
  const { data: supervisors } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'telesales_supervisor')
    .eq('is_active', true)

  if (supervisors && supervisors.length > 0) {
    await supabase.from('notifications').insert(
      supervisors.map((s) => ({
        user_id: s.id,
        lead_id: lead.id,
        type: 'new_lead_unassigned',
        message: `New lead awaiting assignment: ${payload.name}`,
      }))
    )
  }

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
