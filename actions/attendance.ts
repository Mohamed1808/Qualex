'use server'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const CAIRO_TZ = 'Africa/Cairo'

function todayCairo(): string {
  return format(toZonedTime(new Date(), CAIRO_TZ), 'yyyy-MM-dd')
}

export async function checkIn() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const today = todayCairo()
  const now = new Date().toISOString()

  // Allow re-check-in: reset checked_out and on_break as well
  const { error } = await supabase
    .from('daily_attendance')
    .upsert(
      {
        agent_id: user.id,
        date: today,
        checked_in: true,
        checked_in_at: now,
        checked_out: false,
        checked_out_at: null,
        on_break: false,
      },
      { onConflict: 'agent_id,date' }
    )

  if (error) return { error: error.message }

  // Reset profile break status too
  await supabase
    .from('profiles')
    .update({ is_on_break: false, break_started_at: null })
    .eq('id', user.id)

  return { success: true }
}

export async function startBreak() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const today = todayCairo()
  const now = new Date().toISOString()

  // Fetch current break log
  const { data: attendance, error: fetchError } = await supabase
    .from('daily_attendance')
    .select('break_log, on_break')
    .eq('agent_id', user.id)
    .eq('date', today)
    .single()

  if (fetchError || !attendance) return { error: 'No attendance record found. Check in first.' }
  if (attendance.on_break) return { error: 'Already on break' }

  const breakLog = (attendance.break_log as Array<{ started_at: string; ended_at: string | null }>) ?? []
  const newBreakLog = [...breakLog, { started_at: now, ended_at: null }]

  // Update profile too
  await supabase
    .from('profiles')
    .update({ is_on_break: true, break_started_at: now })
    .eq('id', user.id)

  const { error } = await supabase
    .from('daily_attendance')
    .update({ on_break: true, break_log: newBreakLog })
    .eq('agent_id', user.id)
    .eq('date', today)

  if (error) return { error: error.message }
  return { success: true }
}

export async function endBreak() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const today = todayCairo()
  const now = new Date().toISOString()

  const { data: attendance, error: fetchError } = await supabase
    .from('daily_attendance')
    .select('break_log, on_break')
    .eq('agent_id', user.id)
    .eq('date', today)
    .single()

  if (fetchError || !attendance) return { error: 'No attendance record found' }
  if (!attendance.on_break) return { error: 'Not currently on break' }

  const breakLog = (attendance.break_log as Array<{ started_at: string; ended_at: string | null }>) ?? []
  const updatedLog = breakLog.map((entry, idx) =>
    idx === breakLog.length - 1 ? { ...entry, ended_at: now } : entry
  )

  // Update profile
  await supabase
    .from('profiles')
    .update({ is_on_break: false, break_started_at: null })
    .eq('id', user.id)

  const { error } = await supabase
    .from('daily_attendance')
    .update({ on_break: false, break_log: updatedLog })
    .eq('agent_id', user.id)
    .eq('date', today)

  if (error) return { error: error.message }
  return { success: true }
}

export async function checkOut() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const today = todayCairo()
  const now = new Date().toISOString()

  const { data: attendance } = await supabase
    .from('daily_attendance')
    .select('on_break, break_log')
    .eq('agent_id', user.id)
    .eq('date', today)
    .single()

  // If on break, end it first
  let breakLog = (attendance?.break_log as Array<{ started_at: string; ended_at: string | null }>) ?? []
  if (attendance?.on_break) {
    breakLog = breakLog.map((entry, idx) =>
      idx === breakLog.length - 1 ? { ...entry, ended_at: now } : entry
    )
    await supabase
      .from('profiles')
      .update({ is_on_break: false, break_started_at: null })
      .eq('id', user.id)
  }

  const { error } = await supabase
    .from('daily_attendance')
    .update({
      checked_out: true,
      checked_out_at: now,
      on_break: false,
      break_log: breakLog,
    })
    .eq('agent_id', user.id)
    .eq('date', today)

  if (error) return { error: error.message }
  return { success: true }
}
