import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { isPreviewMode, MOCK_PROFILES, MOCK_ATTENDANCE } from '@/lib/preview'

const CAIRO_TZ = 'Africa/Cairo'

export default async function DSAttendancePage() {
  if (isPreviewMode()) {
    const agents = MOCK_PROFILES.filter((p) => p.role === 'direct_sales_agent')
    const attendance = MOCK_ATTENDANCE.filter((a) =>
      agents.some((ag) => ag.id === a.agent_id)
    )
    const attendanceMap = new Map(attendance.map((a) => [a.agent_id, a]))

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">DS Attendance Board</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{format(toZonedTime(new Date(), CAIRO_TZ), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total DS Agents', value: agents.length, color: '#14B8A6' },
            { label: 'Checked In', value: attendance.filter((a) => a.checked_in && !a.checked_out).length, color: '#22C55E' },
            { label: 'On Break', value: attendance.filter((a) => a.on_break).length, color: '#F59E0B' },
            { label: 'Checked Out', value: attendance.filter((a) => a.checked_out).length, color: '#6B7280' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-xs text-[#6B7280] mb-1">{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Agent', 'Status', 'Check In', 'Break Time', 'Check Out'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const att = attendanceMap.get(agent.id)
                const statusLabel = !att?.checked_in ? 'Not Checked In' : att.checked_out ? 'Checked Out' : att.on_break ? 'On Break' : 'Active'
                const statusColor = !att?.checked_in ? '#4B5563' : att.checked_out ? '#6B7280' : att.on_break ? '#F59E0B' : '#22C55E'
                const breakLog = att?.break_log ?? []
                const totalBreakMs = breakLog.reduce((acc, entry) => {
                  if (!entry.ended_at) return acc
                  return acc + new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()
                }, 0)
                const breakMins = Math.floor(totalBreakMs / 60000)
                return (
                  <tr key={agent.id} className="border-b border-[#2a2a2a] last:border-0">
                    <td className="px-4 py-3 text-white font-medium">{agent.full_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: statusColor, backgroundColor: `${statusColor}20` }}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">{att?.checked_in_at ? format(toZonedTime(new Date(att.checked_in_at), CAIRO_TZ), 'h:mm a') : '—'}</td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">{breakMins > 0 ? `${breakMins}m` : '—'}</td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">{att?.checked_out_at ? format(toZonedTime(new Date(att.checked_out_at), CAIRO_TZ), 'h:mm a') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = format(toZonedTime(new Date(), CAIRO_TZ), 'yyyy-MM-dd')

  const { data: attendance } = await supabase
    .from('daily_attendance')
    .select('*, profiles:agent_id(id, full_name, role)')
    .eq('date', today)

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, is_on_break')
    .eq('role', 'direct_sales_agent')
    .eq('is_active', true)

  const attendanceMap = new Map(attendance?.map((a) => [a.agent_id, a]) ?? [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">DS Attendance Board</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {format(toZonedTime(new Date(), CAIRO_TZ), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total DS Agents', value: agents?.length ?? 0, color: '#14B8A6' },
          {
            label: 'Checked In',
            value: attendance?.filter((a) => a.checked_in && !a.checked_out).length ?? 0,
            color: '#22C55E',
          },
          {
            label: 'On Break',
            value: attendance?.filter((a) => a.on_break).length ?? 0,
            color: '#F59E0B',
          },
          {
            label: 'Checked Out',
            value: attendance?.filter((a) => a.checked_out).length ?? 0,
            color: '#6B7280',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-[#6B7280] mb-1">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Agent', 'Status', 'Check In', 'Break Time', 'Check Out'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents?.map((agent) => {
              const att = attendanceMap.get(agent.id)
              const statusLabel = !att?.checked_in
                ? 'Not Checked In'
                : att.checked_out
                ? 'Checked Out'
                : att.on_break
                ? 'On Break'
                : 'Active'
              const statusColor = !att?.checked_in
                ? '#4B5563'
                : att.checked_out
                ? '#6B7280'
                : att.on_break
                ? '#F59E0B'
                : '#22C55E'

              const breakLog =
                (att?.break_log as Array<{ started_at: string; ended_at: string | null }>) ?? []
              const totalBreakMs = breakLog.reduce((acc, entry) => {
                if (!entry.ended_at) return acc
                return acc + new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()
              }, 0)
              const breakMins = Math.floor(totalBreakMs / 60000)

              return (
                <tr key={agent.id} className="border-b border-[#2a2a2a] last:border-0">
                  <td className="px-4 py-3 text-white font-medium">{agent.full_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ color: statusColor, backgroundColor: `${statusColor}20` }}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                    {att?.checked_in_at
                      ? format(toZonedTime(new Date(att.checked_in_at), CAIRO_TZ), 'h:mm a')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                    {breakMins > 0 ? `${breakMins}m` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                    {att?.checked_out_at
                      ? format(toZonedTime(new Date(att.checked_out_at), CAIRO_TZ), 'h:mm a')
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
