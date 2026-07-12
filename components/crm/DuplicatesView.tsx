'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead } from '@/lib/crm/types'
import { listLeads, mergeLeads } from '@/lib/crm/service'
import { useSession } from '@/lib/crm/session'
import PageHeader from './ui/PageHeader'
import { CardSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

export default function DuplicatesView() {
  const { user } = useSession()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState<{ phone: string; group: CrmLead[]; survivorId: string } | null>(null)

  async function reload() {
    setLeads(await listLeads())
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  // group by normalized phone; a group with >1 lead is a duplicate cluster
  const clusters = useMemo(() => {
    const norm = (p: string) => p.replace(/\D/g, '').replace(/^0/, '20')
    const map: Record<string, CrmLead[]> = {}
    for (const l of leads) { const k = norm(l.phone); (map[k] ??= []).push(l) }
    return Object.entries(map).filter(([, v]) => v.length > 1)
  }, [leads])

  async function confirmMerge() {
    if (!merging) return
    const others = merging.group.filter((l) => l.id !== merging.survivorId)
    for (const dup of others) {
      await mergeLeads(merging.survivorId, dup.id, user.full_name)
    }
    toast.success(`Merged ${others.length} duplicate${others.length === 1 ? '' : 's'} into one record`)
    setMerging(null)
    reload()
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Duplicate Detection" subtitle={`${clusters.length} phone number(s) appear on more than one lead`} />

      {loading ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : clusters.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl">
          <EmptyState icon="✨" title="No duplicates found" hint="New leads are automatically checked against existing phone numbers." />
        </div>
      ) : clusters.map(([phone, group]) => (
        <div key={phone} className="bg-white border border-[#F59E0B]/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs text-[#F59E0B] font-mono">{phone} · {group.length} leads</p>
            <button onClick={() => setMerging({ phone, group, survivorId: group[0].id })}
              className="text-xs font-medium bg-[#5757e6] hover:bg-[#4444cc] text-white rounded-lg px-3 py-1.5 transition-colors">
              Merge duplicates
            </button>
          </div>
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

      {merging && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setMerging(null)}>
          <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[#111827] mb-1">Merge duplicates</h3>
            <p className="text-xs text-[#6B7280] mb-4">Choose which record to keep. Comments, history, and call attempts from the others will move onto it, then they&apos;ll be deleted.</p>
            <div className="space-y-2">
              {merging.group.map((l) => (
                <label key={l.id} className="flex items-center gap-3 text-xs bg-[#f3f4f6] rounded-lg px-3 py-2.5 cursor-pointer">
                  <input type="radio" name="survivor" checked={merging.survivorId === l.id}
                    onChange={() => setMerging({ ...merging, survivorId: l.id })} className="accent-[#5757e6]" />
                  <span className="flex-1">
                    <span className="text-[#111827] font-medium block">{l.name}</span>
                    <span className="text-[#6B7280] capitalize">{l.stage.replace(/_/g, ' ')} · created {new Date(l.created_at).toLocaleDateString('en-CA')}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={confirmMerge} className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg py-2 transition-colors">Merge into selected</button>
              <button onClick={() => setMerging(null)} className="px-4 text-sm text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
