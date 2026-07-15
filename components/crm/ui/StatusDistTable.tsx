'use client'

import type { LeadStatus } from '@/lib/crm/types'

/**
 * Status distribution rendered as a table (name · color · count · share bar)
 * instead of loose chips. Shared by the supervisor and management analytics.
 */
export default function StatusDistTable({ statuses, counts, title }: {
  statuses: LeadStatus[]
  counts: Record<string, number>
  title?: string
}) {
  const total = statuses.reduce((sum, s) => sum + (counts[s.id] ?? 0), 0)
  return (
    <div>
      {title && <h4 className="text-xs font-semibold text-[#4B5563] uppercase tracking-wide mb-2">{title}</h4>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-left text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 px-3 text-right w-16">Count</th>
              <th className="py-2 pl-3 w-32">Share</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => {
              const c = counts[s.id] ?? 0
              const pct = total ? Math.round((c / total) * 100) : 0
              return (
                <tr key={s.id} className="border-b border-[#f3f4f6] last:border-0">
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[#374151] text-xs">{s.name}</span>
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-semibold text-xs" style={{ color: c ? s.color : '#9CA3AF' }}>{c}</td>
                  <td className="py-1.5 pl-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#f3f4f6] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] w-8 text-right">{pct}%</span>
                    </div>
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
