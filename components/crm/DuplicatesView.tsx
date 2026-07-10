'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CrmLead } from '@/lib/crm/types'
import { listLeads } from '@/lib/crm/service'

export default function DuplicatesView() {
  const [leads, setLeads] = useState<CrmLead[]>([])
  useEffect(() => { listLeads().then(setLeads) }, [])

  // group by normalized phone; a group with >1 lead is a duplicate cluster
  const clusters = useMemo(() => {
    const norm = (p: string) => p.replace(/\D/g, '').replace(/^0/, '20')
    const map: Record<string, CrmLead[]> = {}
    for (const l of leads) { const k = norm(l.phone); (map[k] ??= []).push(l) }
    return Object.entries(map).filter(([, v]) => v.length > 1)
  }, [leads])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-[#111827]">Duplicate Detection</h1>
      <p className="text-sm text-[#6B7280]">{clusters.length} phone number(s) appear on more than one lead.</p>
      {clusters.length === 0 ? (
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-xl py-16 text-center text-[#4B5563] text-sm">No duplicates found.</div>
      ) : clusters.map(([phone, group]) => (
        <div key={phone} className="bg-[#ffffff] border border-[#F59E0B]/30 rounded-xl p-4">
          <p className="text-xs text-[#F59E0B] font-mono mb-2">{phone} · {group.length} leads</p>
          <div className="space-y-1">
            {group.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-xs bg-[#f3f4f6] rounded-lg px-3 py-2">
                <span className="text-[#111827]">{l.name}</span>
                <span className="text-[#4B5563] capitalize">{l.stage.replace(/_/g, ' ')}</span>
                <span className="text-[#6B7280]">{new Date(l.created_at).toLocaleDateString('en-CA')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
