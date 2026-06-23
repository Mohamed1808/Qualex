'use client'

import { useState } from 'react'
import { getStageLabel } from '@/lib/assignment'
import { format, parseISO } from 'date-fns'

interface AuditRow {
  id: string
  from_stage: string | null
  to_stage: string
  changed_at: string
  note: string | null
  lead?: { name: string; phone: string } | null
  changed_by_profile?: { full_name: string; role: string } | null
}

interface AuditLogProps {
  initialRows: AuditRow[]
}

function stageColor(stage: string): string {
  if (stage === 'approved') return '#22C55E'
  if (['rejected', 'unqualified', 'terminated', 'unreachable'].includes(stage)) return '#F26161'
  if (stage === 'retired') return '#F59E0B'
  if (['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'].includes(stage))
    return '#14B8A6'
  return '#5757e6'
}

export default function AuditLog({ initialRows }: AuditLogProps) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')

  const filtered = initialRows.filter((row) => {
    if (stageFilter && row.to_stage !== stageFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const inLead =
        row.lead?.name?.toLowerCase().includes(q) || row.lead?.phone?.includes(search)
      const inActor = row.changed_by_profile?.full_name?.toLowerCase().includes(q)
      if (!inLead && !inActor) return false
    }
    return true
  })

  const stages = [
    'new', 'telesales_assigned', 'telesales_in_progress', 'qualified', 'unqualified',
    'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted', 'approved',
    'rejected', 'unreachable', 'retired', 'terminated',
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Audit Log</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Every stage change across all leads — {filtered.length} of {initialRows.length} shown
        </p>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by lead, phone, or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
        >
          <option value="">All transitions</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              → {getStageLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['When', 'Lead', 'Transition', 'By', 'Note'].map((h) => (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#4B5563] text-sm">
                    No matching audit entries
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const color = stageColor(row.to_stage)
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1c1c22] transition-colors"
                    >
                      <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap">
                        {format(parseISO(row.changed_at), 'MMM d, yyyy · HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white text-xs font-medium truncate max-w-[160px]">
                          {row.lead?.name ?? '—'}
                        </p>
                        <p className="text-[#4B5563] text-[10px] font-mono">{row.lead?.phone ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {row.from_stage && (
                            <>
                              <span className="text-[10px] text-[#6B7280]">
                                {getStageLabel(row.from_stage)}
                              </span>
                              <span className="text-[#4B5563]">→</span>
                            </>
                          )}
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ color, backgroundColor: `${color}1a` }}
                          >
                            {getStageLabel(row.to_stage)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.changed_by_profile ? (
                          <>
                            <p className="text-[#9CA3AF]">{row.changed_by_profile.full_name}</p>
                            <p className="text-[#4B5563] text-[10px] capitalize">
                              {row.changed_by_profile.role.replace(/_/g, ' ')}
                            </p>
                          </>
                        ) : (
                          <span className="text-[#4B5563]">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF] text-xs max-w-[280px]">
                        {row.note ?? '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
