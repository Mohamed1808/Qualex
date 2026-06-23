import { addDays, setHours, setMinutes, setSeconds, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const CAIRO_TZ = 'Africa/Cairo'
const WORK_START = 9  // 9 AM
const WORK_END = 17   // 5 PM

// Egypt weekend: Friday (5) and Saturday (6)
function isEgyptWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 5 || day === 6
}

function nextWorkday(date: Date): Date {
  let next = addDays(date, 1)
  while (isEgyptWeekend(next)) next = addDays(next, 1)
  return next
}

/**
 * Add working hours to a date (Cairo timezone)
 */
export function addWorkingHours(date: Date, hours: number): Date {
  const cairoDate = toZonedTime(date, CAIRO_TZ)
  let remaining = hours
  let current = cairoDate

  while (remaining > 0) {
    if (isEgyptWeekend(current)) {
      current = setHours(setMinutes(setSeconds(nextWorkday(current), 0), 0), WORK_START)
      continue
    }

    const currentHour = current.getHours() + current.getMinutes() / 60

    if (currentHour < WORK_START) {
      current = setHours(setMinutes(setSeconds(current, 0), 0), WORK_START)
      continue
    }

    if (currentHour >= WORK_END) {
      current = setHours(setMinutes(setSeconds(nextWorkday(current), 0), 0), WORK_START)
      continue
    }

    const hoursUntilEnd = WORK_END - currentHour
    if (remaining <= hoursUntilEnd) {
      const minutesToAdd = remaining * 60
      current = new Date(current.getTime() + minutesToAdd * 60 * 1000)
      remaining = 0
    } else {
      remaining -= hoursUntilEnd
      current = setHours(setMinutes(setSeconds(nextWorkday(current), 0), 0), WORK_START)
    }
  }

  return fromZonedTime(current, CAIRO_TZ)
}

export type SLAStatus = 'ok' | 'warning' | 'breached'

export function getSLAStatus(dueAt: string | null, breached: boolean): SLAStatus {
  if (breached || !dueAt) return 'breached'
  const due = parseISO(dueAt)
  const now = new Date()
  const msRemaining = due.getTime() - now.getTime()
  if (msRemaining <= 0) return 'breached'
  if (msRemaining <= 10 * 60 * 1000) return 'warning'
  return 'ok'
}

export function formatSLACountdown(dueAt: string): string {
  const due = parseISO(dueAt)
  const now = new Date()
  const ms = due.getTime() - now.getTime()
  if (ms <= 0) return 'Breached'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

// SLA durations in working hours
export const SLA_TELESALES_HOURS = 2  // 2 working hours to first call
export const SLA_DS_HOURS = 4         // 4 working hours for DS to reach customer
