'use client'

import { useState } from 'react'
import type { DailyAttendance } from '@/types/database'
import { toast } from 'sonner'
import { checkIn, startBreak, endBreak, checkOut } from '@/actions/attendance'

interface BreakButtonProps {
  attendance: DailyAttendance | null
  agentId: string
  onUpdate?: () => void
}

export default function BreakButton({ attendance, agentId, onUpdate }: BreakButtonProps) {
  const [loading, setLoading] = useState(false)

  async function run(action: () => Promise<{ error?: string }>, label: string) {
    setLoading(true)
    try {
      const result = await action()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(label)
        onUpdate?.()
      }
    } catch {
      toast.error('Action failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!attendance || !attendance.checked_in) {
    return (
      <button
        onClick={() => run(checkIn, 'Checked in!')}
        disabled={loading}
        className="flex items-center gap-2 bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/30 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        Check In
      </button>
    )
  }

  if (attendance.checked_out) {
    return (
      <span className="text-xs text-[#6B7280] px-3 py-2">Shift ended</span>
    )
  }

  if (attendance.on_break) {
    return (
      <button
        onClick={() => run(endBreak, 'Break ended')}
        disabled={loading}
        className="flex items-center gap-2 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/30 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 animate-pulse"
      >
        {loading ? <LoadingSpinner /> : '☕'}
        End Break
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run(startBreak, 'Break started')}
        disabled={loading}
        className="flex items-center gap-2 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/20 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? <LoadingSpinner /> : '☕'}
        Break
      </button>
      <button
        onClick={() => run(checkOut, 'Checked out. Have a great day!')}
        disabled={loading}
        className="flex items-center gap-2 bg-[#F26161]/10 hover:bg-[#F26161]/20 text-[#F26161] border border-[#F26161]/20 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? <LoadingSpinner /> : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        )}
        Check Out
      </button>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
