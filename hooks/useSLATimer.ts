'use client'

import { useEffect, useState } from 'react'
import { getSLAStatus, formatSLACountdown, type SLAStatus } from '@/lib/sla'

interface SLATimerResult {
  timeLeft: string
  status: SLAStatus
}

export function useSLATimer(dueAt: string | null, breached: boolean): SLATimerResult {
  const [result, setResult] = useState<SLATimerResult>(() => ({
    timeLeft: dueAt ? formatSLACountdown(dueAt) : 'No SLA',
    status: getSLAStatus(dueAt, breached),
  }))

  useEffect(() => {
    function update() {
      const status = getSLAStatus(dueAt, breached)
      const timeLeft = !dueAt || status === 'breached' ? 'Breached' : formatSLACountdown(dueAt)
      setResult({ timeLeft, status })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [dueAt, breached])

  return result
}
