'use client'

import { useEffect, useState } from 'react'
import type { Attendance, CrmUser } from '@/lib/crm/types'
import { listAttendance, listUsers } from '@/lib/crm/service'

export default function AttendanceBoard() {
  const [att, setAtt] = useState<Attendance[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  useEffect(() => { listAttendance().then(setAtt); listUsers().then(setUsers) }, [])

  const agents = users.filter((u) => u.role.includes('agent'))
  const byUser = Object.fromEntries(att.map((a) => [a.user_id, a]))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-[#111827]">Attendance — Today</h1>
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              <th className="px-4 py-3">Agent</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Checked in</th><th className="px-4 py-3">Breaks</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((u) => {
              const a = byUser[u.id]
              const state = !a || !a.checked_in ? 'Not in' : a.checked_out ? 'Checked out' : a.on_break ? 'On break' : 'Available'
              const color = state === 'Available' ? '#22C55E' : state === 'On break' ? '#F59E0B' : '#6B7280'
              return (
                <tr key={u.id} className="border-b border-[#e5e7eb] last:border-0">
                  <td className="px-4 py-3 text-[#111827]">{u.full_name} <span className="text-[#6B7280] text-xs">· {u.title}</span></td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}20` }}>{state}</span></td>
                  <td className="px-4 py-3 text-xs text-[#4B5563]">{a?.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#4B5563]">{a?.break_log.length ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
