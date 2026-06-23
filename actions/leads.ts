'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeEgyptianPhone } from '@/lib/phone'
import { addWorkingHours, SLA_TELESALES_HOURS } from '@/lib/sla'
import type { LeadChannel, QualificationData } from '@/types/database'
import { isTerminalStage } from '@/lib/assignment'

interface CreateLeadInput {
  name: string
  phone: string
  channel: LeadChannel
  requested_car_brand?: string
  requested_car_year?: number
  source_campaign?: string
}

export async function createLead(data: CreateLeadInput) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const phoneNormalized = normalizeEgyptianPhone(data.phone)
  const slaDueAt = addWorkingHours(new Date(), SLA_TELESALES_HOURS)

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      name: data.name,
      phone: data.phone,
      phone_normalized: phoneNormalized,
      channel: data.channel,
      requested_car_brand: data.requested_car_brand ?? null,
      requested_car_year: data.requested_car_year ?? null,
      source_campaign: data.source_campaign ?? null,
      tele_sla_due_at: slaDueAt.toISOString(),
      stage: 'new',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // New leads land unassigned in the Telesales Supervisor queue (stage 'new').
  // The supervisor assigns them to an agent manually.

  // Log stage history
  await supabase.from('lead_stage_history').insert({
    lead_id: lead.id,
    from_stage: null,
    to_stage: 'new',
    changed_by: user.id,
    note: 'Lead created',
  })

  return { data: lead }
}

export async function updateLeadDisposition(
  leadId: string,
  disposition: string,
  notes: string,
  stage: 'telesales' | 'direct_sales'
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch current lead
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('stage, tele_disposition, ds_disposition')
    .eq('id', leadId)
    .single()

  if (fetchError || !lead) return { error: 'Lead not found' }
  if (isTerminalStage(lead.stage)) return { error: 'Lead is in a terminal stage' }

  const updates: Record<string, unknown> = {}

  if (stage === 'telesales') {
    updates.tele_disposition = disposition
    if (notes) updates.tele_notes = notes
    if (disposition === 'qualified') {
      updates.stage = 'qualified'
      updates.telesales_qualified_at = new Date().toISOString()
    } else if (disposition === 'unqualified') {
      updates.stage = 'unqualified'
      updates.unqualification_reason = notes
    } else if (disposition === 'terminated') {
      updates.stage = 'terminated'
    } else if (disposition === 'retired') {
      updates.stage = 'retired'
    } else if (disposition === 'no_answer') {
      updates.stage = 'telesales_in_progress'
    }
  } else {
    updates.ds_disposition = disposition
    if (notes) updates.ds_notes = notes
    if (disposition === 'qualified') {
      updates.stage = 'approved'
    } else if (disposition === 'unqualified') {
      updates.stage = 'rejected'
      updates.unqualification_reason = notes
    } else if (disposition === 'terminated') {
      updates.stage = 'terminated'
    } else if (disposition === 'retired') {
      updates.stage = 'retired'
    } else if (disposition === 'no_answer') {
      updates.stage = 'ds_in_progress'
    }
  }

  const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
  if (error) return { error: error.message }

  // Log stage history
  if (updates.stage) {
    await supabase.from('lead_stage_history').insert({
      lead_id: leadId,
      from_stage: lead.stage,
      to_stage: updates.stage,
      changed_by: user.id,
      note: `Disposition: ${disposition}${notes ? ` — ${notes}` : ''}`,
    })
  }

  return { success: true }
}

export async function updateQualificationFields(
  leadId: string,
  fields: Partial<{
    salary_bracket: string
    down_payment_bracket: string
    financing_program: 'new_car' | 'used_car' | 'collateral'
    car_source: 'dealer' | 'individual_c2c' | 'undecided'
    knows_specific_car: boolean
    occupation: string
    customer_national_id: string
    tele_notes: string
    ds_notes: string
    tele_follow_up_at: string
    ds_follow_up_at: string
    id_document_url: string
    stage: string
  }>
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('leads').update(fields).eq('id', leadId)
  if (error) return { error: error.message }

  return { success: true }
}

export async function qualifyLead(leadId: string, qualificationData: QualificationData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('stage')
    .eq('id', leadId)
    .single()

  if (fetchError || !lead) return { error: 'Lead not found' }
  if (isTerminalStage(lead.stage)) return { error: 'Lead is already in a terminal stage' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('leads')
    .update({
      stage: 'qualified',
      tele_disposition: 'qualified',
      telesales_qualified_at: now,
      salary_bracket: qualificationData.salary_bracket,
      down_payment_bracket: qualificationData.down_payment_bracket,
      financing_program: qualificationData.financing_program,
      car_source: qualificationData.car_source,
      knows_specific_car: qualificationData.knows_specific_car,
      occupation: qualificationData.occupation,
      customer_national_id: qualificationData.customer_national_id ?? null,
      tele_notes: qualificationData.tele_notes ?? null,
    })
    .eq('id', leadId)

  if (error) return { error: error.message }

  // Log stage history
  await supabase.from('lead_stage_history').insert({
    lead_id: leadId,
    from_stage: lead.stage,
    to_stage: 'qualified',
    changed_by: user.id,
    note: 'Lead qualified by telesales',
  })

  // Qualified leads land unassigned in the Direct Sales Supervisor queue (stage 'qualified').
  // The DS supervisor assigns them to a direct sales agent manually.

  return { success: true }
}

export async function unqualifyLead(leadId: string, reason: string, notes: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('stage')
    .eq('id', leadId)
    .single()

  if (fetchError || !lead) return { error: 'Lead not found' }
  if (isTerminalStage(lead.stage)) return { error: 'Lead is already in a terminal stage' }

  const { error } = await supabase
    .from('leads')
    .update({
      stage: 'unqualified',
      tele_disposition: 'unqualified',
      unqualification_reason: reason,
      tele_notes: notes,
    })
    .eq('id', leadId)

  if (error) return { error: error.message }

  await supabase.from('lead_stage_history').insert({
    lead_id: leadId,
    from_stage: lead.stage,
    to_stage: 'unqualified',
    changed_by: user.id,
    note: `Unqualified: ${reason}${notes ? ` — ${notes}` : ''}`,
  })

  return { success: true }
}
