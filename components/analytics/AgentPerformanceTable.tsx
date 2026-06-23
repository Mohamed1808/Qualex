'use client'

import { useState } from 'react'

interface AgentPerformanceRow {
  agentId: string
  agentName: string
  totalLeads: number
  qualified: number
  unqualified: number
  terminated: number
  avgCallsToQualify: number
  slaCompliance: number
}

interface AgentPerformanceTableProps {
  data: AgentPerformanceRow[]
  teamType: 'telesales' | 'direct_sales'
}

type SortKey = keyof AgentPerformanceRow
type SortDir = 'asc' | 'desc'

export default function AgentPerformanceTable({ data, teamType }: AgentPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('qualified')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] as number | string
    const bv = b[sortKey] as number | string
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const accentColor = teamType === 'telesales' ? '#5757e6' : '#14B8A6'

  const columns: { key: SortKey; label: string }[] = [
    { key: 'agentName', label: 'Agent' },
    { key: 'totalLeads', label: 'Total Leads' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'unqualified', label: 'Unqualified' },
    { key: 'terminated', label: 'Terminated' },
    { key: 'avgCallsToQualify', label: 'Avg Calls' },
    { key: 'slaCompliance', label: 'SLA %' },
  ]

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2a2a2a]">
        <h3 className="text-sm font-semibold text-white">Agent Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide cursor-pointer hover:text-white transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#4B5563] text-sm">
                  No data available
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => {
                const qualPct =
                  row.totalLeads > 0
                    ? Math.round((row.qualified / row.totalLeads) * 100)
                    : 0
                return (
                  <tr
                    key={row.agentId}
                    className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1c1c22] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-white font-medium">{row.agentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{row.totalLeads}</td>
                    <td className="px-4 py-3">
                      <span className="text-[#22C55E] font-medium">{row.qualified}</span>
                      <span className="text-[#4B5563] text-xs ml-1">({qualPct}%)</span>
                    </td>
                    <td className="px-4 py-3 text-[#F26161]">{row.unqualified}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{row.terminated}</td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{row.avgCallsToQualify.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#2a2a2a] rounded-full h-1.5 max-w-[60px]">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${row.slaCompliance}%`,
                              backgroundColor:
                                row.slaCompliance >= 80
                                  ? '#22C55E'
                                  : row.slaCompliance >= 60
                                  ? '#F59E0B'
                                  : '#F26161',
                            }}
                          />
                        </div>
                        <span className="text-xs text-[#9CA3AF]">{row.slaCompliance}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
