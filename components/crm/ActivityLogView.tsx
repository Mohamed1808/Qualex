'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ActivityLogEntry, ActivityCategory, CrmUser } from '@/lib/crm/types'
import { listActivityLog, listUsers } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import PageHeader from './ui/PageHeader'
import { TableSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  attendance: 'Attendance',
  call_attempt: 'Call Attempt',
  qualify: 'Qualify',
  disposition: 'Disposition',
  kyc_update: 'KYC Update',
  reminder: 'Reminder',
  reassignment: 'Reassignment',
  assignment: 'Assignment',
  comment: 'Comment',
}

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  attendance: '#6B7280',
  call_attempt: '#5757e6',
  qualify: '#22C55E',
  disposition: '#F59E0B',
  kyc_update: '#0EA5E9',
  reminder: '#F59E0B',
  reassignment: '#F26161',
  assignment: '#5757e6',
  comment: '#6B7280',
}

/**
 * Supervisor/admin-only activity log — every timestamped action an agent
 * takes anywhere in the system, for SLA tracking (response times, idle gaps).
 * Intentionally not linked from any agent-facing screen.
 */
export default function ActivityLogView() {
  const { user } = useSession()
  const [rows, setRows] = useState<ActivityLogEntry[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // A supervisor only sees the agents under them (their team's role); admin sees all.
  const scopedAgentRole =
    user.role === 'telesales_supervisor' ? 'telesales_agent'
    : user.role === 'direct_sales_supervisor' ? 'direct_sales_agent'
    : null
  const agents = users.filter((u) => scopedAgentRole ? u.role === scopedAgentRole : u.role.includes('agent'))
  const allowedIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents])

  async function reload() {
    const [r, u] = await Promise.all([
      listActivityLog({
        user_id: userFilter || undefined,
        category: (categoryFilter || undefined) as ActivityCategory | undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      }),
      listUsers(),
    ])
    setRows(r); setUsers(u); setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [userFilter, categoryFilter, from, to])

  // Restrict rows to the agents this supervisor manages (admin: no restriction).
  const scopedRows = scopedAgentRole ? rows.filter((r) => r.user_id && allowedIds.has(r.user_id)) : rows
  const hasFilters = !!(userFilter || categoryFilter || from || to)

  // Idle check: last activity per agent, flag if > 2 hours since last logged action while checked in.
  const lastActivityByUser = useMemo(() => {
    const m: Record<string, string> = {}
    for (const r of scopedRows) {
      if (!r.user_id) continue
      if (!m[r.user_id] || r.at > m[r.user_id]) m[r.user_id] = r.at
    }
    return m
  }, [scopedRows])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        crumbs={[{ label: 'CRM', href: '/crm' }]}
        title="Activity Log"
        subtitle="Every timestamped agent action, for SLA and response-time tracking"
      />

      {/* Per-agent last-activity snapshot */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[#4B5563] uppercase tracking-wide mb-3">Last activity per agent</h3>
        <div className="flex flex-wrap gap-2">
          {agents.map((a) => {
            const last = lastActivityByUser[a.id]
            const minsAgo = last ? Math.round((Date.now() - new Date(last).getTime()) / 60000) : null
            const idle = minsAgo !== null && minsAgo > 120
            return (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f3f4f6]">
                <span className={`w-2 h-2 rounded-full ${idle ? 'bg-[#F26161]' : minsAgo === null ? 'bg-[#9CA3AF]' : 'bg-[#22C55E]'}`} />
                <span className="text-xs text-[#111827]">{a.full_name}</span>
                <span className={`text-[10px] ${idle ? 'text-[#F26161] font-medium' : 'text-[#6B7280]'}`}>
                  {minsAgo === null ? 'no activity yet' : minsAgo < 1 ? 'just now' : `${minsAgo}m ago`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={sel}>
          <option value="">All agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as ActivityCategory | '')} className={sel}>
          <option value="">All categories</option>
          {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={sel} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={sel} />
        {hasFilters && (
          <button onClick={() => { setUserFilter(''); setCategoryFilter(''); setFrom(''); setTo('') }} className="text-xs text-[#5757e6] hover:text-[#4444cc] self-center">Reset</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Time</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Action</th><th className="px-4 py-3">Lead</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={8} cols={5} />
              ) : scopedRows.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon="🕒" title="No activity recorded" hint={hasFilters ? 'Try different filters.' : 'Activity will appear here as agents work leads.'} /></td></tr>
              ) : scopedRows.map((r) => (
                <tr key={r.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#4B5563] whitespace-nowrap">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#111827] text-sm">{r.user_name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: CATEGORY_COLORS[r.category], backgroundColor: `${CATEGORY_COLORS[r.category]}18` }}>
                      {CATEGORY_LABELS[r.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#4B5563] max-w-[320px] truncate" title={r.action}>{r.action}</td>
                  <td className="px-4 py-3 text-xs text-[#4B5563]">{r.lead_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const sel = 'bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
