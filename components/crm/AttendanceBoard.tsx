'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Attendance, CrmUser } from '@/lib/crm/types'
import { listAttendance, listUsers } from '@/lib/crm/service'
import PageHeader from './ui/PageHeader'
import { CardSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

const SHIFT_HOURS = 8.5
const BREAK_LIMIT_MIN = 60

function fmtTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
}
function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

interface AgentDay {
  user: CrmUser
  att: Attendance | undefined
  state: string
  start: number | null
  end: number | null
  breakMs: number
  workedMs: number
  breakOver: boolean
}

export default function AttendanceBoard() {
  const [att, setAtt] = useState<Attendance[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listAttendance(), listUsers()]).then(([a, u]) => { setAtt(a); setUsers(u); setLoading(false) })
  }, [])

  const agents = users.filter((u) => u.role.includes('agent'))
  const byUser = useMemo(() => Object.fromEntries(att.map((a) => [a.user_id, a])), [att])

  const rows: AgentDay[] = agents.map((u) => {
    const a = byUser[u.id]
    const now = Date.now()
    const start = a?.checked_in_at ? new Date(a.checked_in_at).getTime() : null
    const end = a?.checked_out ? (a.checked_out_at ? new Date(a.checked_out_at).getTime() : now) : (a?.checked_in ? now : null)
    const breakMs = (a?.break_log ?? []).reduce((sum, b) => sum + ((b.ended_at ? new Date(b.ended_at).getTime() : now) - new Date(b.started_at).getTime()), 0)
    const workedMs = start && end ? Math.max(0, (end - start) - breakMs) : 0
    const state = !a || !a.checked_in ? 'Not in' : a.checked_out ? 'Checked out' : a.on_break ? 'On break' : 'Available'
    return { user: u, att: a, state, start, end, breakMs, workedMs, breakOver: breakMs > BREAK_LIMIT_MIN * 60000 }
  })

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Attendance — Today" subtitle={`${agents.length} agents · ${SHIFT_HOURS}h shift`} />

      {loading ? (
        <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
      ) : agents.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl"><EmptyState icon="✅" title="No agents to track yet" /></div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const color = r.state === 'Available' ? '#22C55E' : r.state === 'On break' ? '#F59E0B' : r.state === 'Checked out' ? '#5757e6' : '#6B7280'
            const open = expanded === r.user.id
            return (
              <div key={r.user.id} className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(open ? null : r.user.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[#f3f4f6] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-[#111827] font-medium">{r.user.full_name} <span className="text-[#6B7280] text-xs">· {r.user.title}</span></p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}20` }}>{r.state}</span>
                      <span className="text-xs text-[#6B7280]">Worked {fmtDur(r.workedMs)}</span>
                      <span className={`text-xs ${r.breakOver ? 'text-[#F26161] font-medium' : 'text-[#6B7280]'}`}>Breaks {fmtDur(r.breakMs)}{r.breakOver && ' ⚠'}</span>
                    </div>
                  </div>
                  <span className="text-[#6B7280] text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-[#e5e7eb] pt-4 space-y-4">
                    {r.breakOver && (
                      <div className="bg-[#F26161]/10 border border-[#F26161]/30 rounded-lg px-3 py-2 text-xs text-[#DC2626]">
                        ⚠ Total breaks ({fmtDur(r.breakMs)}) exceeded the 1-hour daily limit.
                      </div>
                    )}

                    {/* Timeline bar */}
                    {r.start && r.end ? (
                      <Timeline att={r.att!} start={r.start} end={r.end} />
                    ) : (
                      <p className="text-xs text-[#6B7280]">Not checked in today.</p>
                    )}

                    {/* Event list */}
                    <div className="space-y-1.5">
                      {r.att?.checked_in_at && <Event dot="#22C55E" label="Checked in" time={fmtTime(r.att.checked_in_at)} />}
                      {(r.att?.break_log ?? []).map((b, i) => (
                        <Event key={i} dot="#F59E0B"
                          label={`Break${b.ended_at ? '' : ' (ongoing)'}`}
                          time={`${fmtTime(b.started_at)} – ${b.ended_at ? fmtTime(b.ended_at) : 'now'} · ${fmtDur((b.ended_at ? new Date(b.ended_at).getTime() : Date.now()) - new Date(b.started_at).getTime())}`} />
                      ))}
                      {r.att?.checked_out && <Event dot="#5757e6" label="Checked out" time={fmtTime(r.att.checked_out_at)} />}
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Worked" value={fmtDur(r.workedMs)} />
                      <Stat label="On break" value={fmtDur(r.breakMs)} danger={r.breakOver} />
                      <Stat label="Shift target" value={`${SHIFT_HOURS}h`} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Timeline({ att, start, end }: { att: Attendance; start: number; end: number }) {
  const span = Math.max(1, end - start)
  return (
    <div>
      <div className="relative h-6 rounded-lg bg-[#22C55E]/25 overflow-hidden">
        {(att.break_log ?? []).map((b, i) => {
          const bStart = new Date(b.started_at).getTime()
          const bEnd = b.ended_at ? new Date(b.ended_at).getTime() : end
          const left = ((bStart - start) / span) * 100
          const width = ((bEnd - bStart) / span) * 100
          return <div key={i} className="absolute top-0 h-6 bg-[#F59E0B]" style={{ left: `${left}%`, width: `${width}%` }} title="Break" />
        })}
      </div>
      <div className="flex justify-between text-[10px] text-[#6B7280] mt-1">
        <span>{fmtTime(new Date(start).toISOString())}</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#22C55E]/50" /> working</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#F59E0B]" /> break</span>
        </span>
        <span>{fmtTime(new Date(end).toISOString())}</span>
      </div>
    </div>
  )
}

function Event({ dot, label, time }: { dot: string; label: string; time: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
      <span className="text-[#111827] w-28 flex-shrink-0">{label}</span>
      <span className="text-[#6B7280]">{time}</span>
    </div>
  )
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="bg-[#f3f4f6] rounded-lg px-3 py-2 text-center">
      <p className="text-[10px] text-[#6B7280] uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold ${danger ? 'text-[#F26161]' : 'text-[#111827]'}`}>{value}</p>
    </div>
  )
}
