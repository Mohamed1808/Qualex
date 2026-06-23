'use client'

import { useRouter } from 'next/navigation'
import type { Lead } from '@/types/database'
import { useLeadQueue } from '@/hooks/useLeadQueue'
import LeadCard from '@/components/shared/LeadCard'

interface DSAgentLeadQueueProps {
  userId: string
  role: string
  initialLeads: Lead[]
}

function SkeletonCard() {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-[#2a2a2a] rounded w-3/4 mb-2" />
      <div className="h-3 bg-[#2a2a2a] rounded w-1/2 mb-4" />
      <div className="h-5 bg-[#2a2a2a] rounded w-1/3 mb-3" />
      <div className="h-3 bg-[#2a2a2a] rounded w-2/3" />
    </div>
  )
}

export default function DSAgentLeadQueue({ userId, role, initialLeads }: DSAgentLeadQueueProps) {
  const router = useRouter()
  const { data: leads, isLoading } = useLeadQueue({ userId, role, initialData: initialLeads })

  const sortedLeads = [...(leads ?? [])].sort((a, b) => {
    if (a.ds_sla_breached && !b.ds_sla_breached) return -1
    if (!a.ds_sla_breached && b.ds_sla_breached) return 1
    if (a.ds_sla_due_at && b.ds_sla_due_at) {
      return new Date(a.ds_sla_due_at).getTime() - new Date(b.ds_sla_due_at).getTime()
    }
    return 0
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">My Lead Queue</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isLoading ? '—' : `${sortedLeads.length} active lead${sortedLeads.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> On time
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] ml-2" /> Warning
          <span className="w-2 h-2 rounded-full bg-[#F26161] ml-2" /> Breached
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sortedLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🎉</span>
          <h2 className="text-lg font-semibold text-white mb-2">No leads pending</h2>
          <p className="text-sm text-[#6B7280]">Great work! New qualified leads will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              teamType="direct_sales"
              onClick={() => router.push(`/direct-sales/agent/${lead.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
