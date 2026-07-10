'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Attendance } from '@/lib/crm/types'
import { getAttendance, checkIn, checkOut, startBreak, endBreak } from '@/lib/crm/service'

export default function AttendanceControls({ userId }: { userId: string }) {
  const [att, setAtt] = useState<Attendance | null>(null)

  async function reload() { setAtt(await getAttendance(userId)) }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [userId])

  if (!att) return null

  async function act(fn: () => Promise<void>, msg: string) {
    await fn()
    toast.success(msg)
    reload()
  }

  if (!att.checked_in || att.checked_out) {
    return (
      <button onClick={() => act(() => checkIn(userId), 'Checked in')}
        className="text-xs font-medium bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-lg px-3 py-1.5">
        Check in
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] px-2 py-1 rounded-full ${att.on_break ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : 'bg-[#22C55E]/15 text-[#22C55E]'}`}>
        {att.on_break ? 'On break' : 'Available'}
      </span>
      {att.on_break ? (
        <button onClick={() => act(() => endBreak(userId), 'Break ended')} className="text-xs text-[#4B5563] hover:text-[#111827] border border-[#e5e7eb] rounded-lg px-2.5 py-1.5">End break</button>
      ) : (
        <button onClick={() => act(() => startBreak(userId), 'On break')} className="text-xs text-[#4B5563] hover:text-[#111827] border border-[#e5e7eb] rounded-lg px-2.5 py-1.5">Break</button>
      )}
      <button onClick={() => act(() => checkOut(userId), 'Checked out')} className="text-xs text-[#F26161] hover:bg-[#F26161]/10 border border-[#F26161]/30 rounded-lg px-2.5 py-1.5">Check out</button>
    </div>
  )
}
