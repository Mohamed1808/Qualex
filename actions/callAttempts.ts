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

  // Fetch existing attempts (oldest → newest) for this lead/stage
  const { data: existingAttempts, error: countError } = await supabase
    .from('call_attempts')
    .select('attempt_number, outcome')
    .eq('lead_id', leadId)
    .eq('stage', stage)
    .order('attempt_number', { ascending: true })

  if (countError) return { error: countError.message }

  const list = existingAttempts ?? []

  // Count the trailing streak of consecutive "no answer" outcomes.
  // A callback or an answered call resets the streak — the customer is still
  // reachable and engaged, so attempts may continue until they decide.
  let noAnswerStreak = 0
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].outcome === 'no_answer') noAnswerStreak++
    else break
  }

  // Hard stop: 3 consecutive no-answers ⇒ customer is unreachable.
  if (noAnswerStreak >= 3) {
    return { error: 'Customer is unreachable after 3 consecutive no-answers.' }
  }

  // The attempt number always increments across the full history.
  const lastNumber = list.length > 0 ? list[list.length - 1].attempt_number : 0
  const nextAttemptNumber = lastNumber + 1

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
      agent_confirmed_call: true,
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  const followUpField = stage === 'telesales' ? 'tele_follow_up_at' : 'ds_follow_up_at'
  const updates: Record<string, unknown> = {}

  const newStreak = outcome === 'no_answer' ? noAnswerStreak + 1 : 0

  if (outcome === 'no_answer' && newStreak >= 3) {
    // Third consecutive no-answer — close the lead as unreachable.
    updates.stage = 'unreachable'
  } else {
    updates.stage = stage === 'telesales' ? 'telesales_in_progress' : 'ds_in_progress'
    if (outcome === 'callback_scheduled' && callbackAt) {
      updates[followUpField] = callbackAt
    }
  }

  await supabase.from('leads').update(updates).eq('id', leadId)

  // Log a stage-history entry when the lead becomes unreachable
  if (updates.stage === 'unreachable') {
    await supabase.from('lead_stage_history').insert({
      lead_id: leadId,
      from_stage: stage === 'telesales' ? 'telesales_in_progress' : 'ds_in_progress',
      to_stage: 'unreachable',
      changed_by: user.id,
      note: 'Closed as unreachable after 3 consecutive no-answers',
    })
  }

  return { data: attempt, unreachable: updates.stage === 'unreachable' }
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
