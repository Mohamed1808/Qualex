'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CrmLead, LeadStatus } from '@/lib/crm/types'
import { listLeads, listStatuses } from '@/lib/crm/service'

const QUALIFIED_PLUS = ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted', 'approved', 'rejected']

export default function CrmAnalytics({ team }: { team: 'telesales' | 'direct_sales' }) {
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  useEffect(() => { listLeads().then(setLeads); listStatuses().then(setStatuses) }, [])

  const kpis = useMemo(() => {
    const total = leads.length
    const qualified = leads.filter((l) => QUALIFIED_PLUS.includes(l.stage)).length
    const approved = leads.filter((l) => l.stage === 'approved').length
    const reached = leads.filter((l) => l.stage !== 'new').length
    return { total, qualified, approved, qualRate: reached ? Math.round((qualified / reached) * 100) : 0 }
  }, [leads])

  const funnel = useMemo(() => ([
    { label: 'Captured', value: leads.length },
    { label: 'Reached', value: leads.filter((l) => l.stage !== 'new').length },
    { label: 'Qualified', value: leads.filter((l) => QUALIFIED_PLUS.includes(l.stage)).length },
    { label: 'In Direct Sales', value: leads.filter((l) => ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted', 'approved', 'rejected'].includes(l.stage)).length },
    { label: 'Submitted to Credit', value: leads.filter((l) => ['credit_submitted', 'approved', 'rejected'].includes(l.stage)).length },
    { label: 'Approved', value: leads.filter((l) => l.stage === 'approved').length },
  ]), [leads])
  const max = Math.max(1, ...funnel.map((f) => f.value))

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads) if (l.status_id) c[l.status_id] = (c[l.status_id] ?? 0) + 1
    return c
  }, [leads])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-white">{team === 'telesales' ? 'Telesales' : 'Direct Sales'} Analytics</h1>

      <div className="grid grid-cols-4 gap-4">
        {[['Total Leads', kpis.total, '#5757e6'], ['Qualified', kpis.qualified, '#14B8A6'], ['Approved', kpis.approved, '#22C55E'], ['Qual. Rate', `${kpis.qualRate}%`, '#F59E0B']].map(([label, val, color]) => (
          <div key={label as string} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-[#6B7280] mb-1">{label as string}</p>
            <p className="text-2xl font-bold" style={{ color: color as string }}>{val as string | number}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Conversion Funnel</h3>
          <div className="space-y-2">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-xs text-[#9CA3AF] w-40">{f.label}</span>
                <div className="flex-1 bg-[#1c1c22] rounded-full h-5 overflow-hidden">
                  <div className="h-5 rounded-full bg-[#5757e6] flex items-center justify-end px-2" style={{ width: `${(f.value / max) * 100}%` }}>
                    <span className="text-[10px] text-white font-semibold">{f.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status Distribution</h3>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${s.color}12` }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-[#cbd5e1]">{s.name}</span>
                <span className="text-xs font-bold" style={{ color: s.color }}>{statusCounts[s.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
