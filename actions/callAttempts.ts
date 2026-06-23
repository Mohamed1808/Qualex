'use server'

import { createClient } from '@/lib/supabase/server'
import type { CallOutcome } from '@/types/database'

export async function logCallAttempt(
  leadId: string,
  stage: 'telesales' | 'direct_sales',
  outcome: CallOutcome,
  callbackAt?: string,
  notes?: string
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Count existing attempts for this lead/stage
  const { data: existingAttempts, error: countError } = await supabase
    .from('call_attempts')
    .select('id, attempt_number')
    .eq('lead_id', leadId)
    .eq('stage', stage)
    .order('attempt_number', { ascending: false })

  if (countError) return { error: countError.message }

  const nextAttemptNumber = (existingAttempts?.[0]?.attempt_number ?? 0) + 1
  if (nextAttemptNumber > 3) return { error: 'Maximum 3 call attempts allowed' }

  // Insert call attempt
  const { data: attempt, error: insertError } = await supabase
    .from('call_attempts')
    .insert({
      lead_id: leadId,
      agent_id: user.id,
      stage,
      attempt_number: nextAttemptNumber,
      outcome,
      callback_at: callbackAt ?? null,
      notes: notes ?? null,
      agent_confirmed_call: nextAttemptNumber === 1, // First attempt auto-confirmed
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  // Update lead stage if needed
  const stageField = stage === 'telesales' ? 'telesales_in_progress' : 'ds_in_progress'
  const followUpField = stage === 'telesales' ? 'tele_follow_up_at' : 'ds_follow_up_at'

  const updates: Record<string, unknown> = {
    stage: stageField,
  }

  if (outcome === 'callback_scheduled' && callbackAt) {
    updates[followUpField] = callbackAt
  }

  await supabase.from('leads').update(updates).eq('id', leadId)

  return { data: attempt }
}

export async function confirmCallAttempt(attemptId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('call_attempts')
    .update({ agent_confirmed_call: true })
    .eq('id', attemptId)
    .eq('agent_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
