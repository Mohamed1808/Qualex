'use client'

import { useEffect, useState } from 'react'
import { formatSLACountdown, getSLAStatus } from '@/lib/sla'

interface SLATimerProps {
  dueAt: string | null
  breached: boolean
  className?: string
}

export default function SLATimer({ dueAt, breached, className = '' }: SLATimerProps) {
  const [display, setDisplay] = useState<string>('')
  const [status, setStatus] = useState<'ok' | 'warning' | 'breached'>('ok')

  useEffect(() => {
    function update() {
      const s = getSLAStatus(dueAt, breached)
      setStatus(s)
      if (!dueAt || s === 'breached') {
        setDisplay('Breached')
      } else {
        setDisplay(formatSLACountdown(dueAt))
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [dueAt, breached])

  const colorClass =
    status === 'ok'
      ? 'text-[#22C55E]'
      : status === 'warning'
      ? 'text-[#F59E0B] animate-pulse'
      : 'text-[#F26161] animate-pulse'

  const bgClass =
    status === 'ok'
      ? 'bg-[#22C55E]/10'
      : status === 'warning'
      ? 'bg-[#F59E0B]/10'
      : 'bg-[#F26161]/10'

  const dotClass =
    status === 'ok'
      ? 'bg-[#22C55E]'
      : status === 'warning'
      ? 'bg-[#F59E0B] animate-pulse'
      : 'bg-[#F26161] animate-pulse'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium ${bgClass} ${colorClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
      {display || '—'}
    </span>
  )
}
