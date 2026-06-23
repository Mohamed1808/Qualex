import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import ChannelBadge from '@/components/shared/ChannelBadge'
import { isPreviewMode, MOCK_LEADS } from '@/lib/preview'

export default async function DSUnqualifiedPage() {
  if (isPreviewMode()) {
    // Add a mock unqualified lead for display
    const mockUnqualifiedLead = {
      ...MOCK_LEADS[1],
      id: 'lead-unq-001',
      name: 'Rania Mostafa',
      phone: '+201099887766',
      stage: 'unqualified' as const,
      ds_disposition: 'unqualified' as const,
      unqualification_reason: 'insufficient_income',
      tele_notes: 'Customer income does not meet minimum requirements.',
    }
    const leads = [...MOCK_LEADS, mockUnqualifiedLead]
    const tsDismissed = leads.filter((l) => l.stage === 'unqualified')
    const dsRejected = leads.filter((l) => l.stage === 'rejected')

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Unqualified Lead Review</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Side-by-side review of TS-unqualified and DS-rejected leads</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#161616] border border-[#F26161]/30 rounded-xl p-4">
            <p className="text-xs text-[#6B7280] mb-1">TS Unqualified</p>
            <p className="text-2xl font-bold text-[#F26161]">{tsDismissed.length}</p>
          </div>
          <div className="bg-[#161616] border border-[#F59E0B]/30 rounded-xl p-4">
            <p className="text-xs text-[#6B7280] mb-1">DS Rejected</p>
            <p className="text-2xl font-bold text-[#F59E0B]">{dsRejected.length}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-[#F26161] mb-3 uppercase tracking-wide">TS Unqualified</h2>
            <div className="space-y-3">
              {tsDismissed.length === 0 ? (
                <p className="text-xs text-[#4B5563] italic">None</p>
              ) : (
                tsDismissed.map((lead) => (
                  <div key={lead.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">{lead.name}</p>
                        <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
                      </div>
                      <ChannelBadge channel={lead.channel} />
                    </div>
                    <div className="text-xs space-y-1">
                      {lead.unqualification_reason && (
                        <div className="flex gap-2">
                          <span className="text-[#6B7280]">Reason:</span>
                          <span className="text-[#F26161]">{lead.unqualification_reason.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {lead.tele_notes && <p className="text-[#6B7280] italic mt-1">{lead.tele_notes}</p>}
                      <p className="text-[#4B5563]">{format(parseISO(lead.updated_at), 'MMM d, HH:mm')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#F59E0B] mb-3 uppercase tracking-wide">DS Rejected</h2>
            <div className="space-y-3">
              {dsRejected.length === 0 ? (
                <p className="text-xs text-[#4B5563] italic">None</p>
              ) : (
                dsRejected.map((lead) => (
                  <div key={lead.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                    <p className="text-sm font-medium text-white">{lead.name}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      profiles_telesales:profiles!leads_assigned_telesales_agent_fkey(id, full_name),
      profiles_direct_sales:profiles!leads_assigned_direct_sales_agent_fkey(id, full_name)
    `)
    .in('stage', ['unqualified', 'rejected'])
    .order('updated_at', { ascending: false })

  const tsDismissed = leads?.filter((l) => l.stage === 'unqualified') ?? []
  const dsRejected = leads?.filter((l) => l.stage === 'rejected') ?? []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Unqualified Lead Review</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Side-by-side review of TS-unqualified and DS-rejected leads
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#161616] border border-[#F26161]/30 rounded-xl p-4">
          <p className="text-xs text-[#6B7280] mb-1">TS Unqualified</p>
          <p className="text-2xl font-bold text-[#F26161]">{tsDismissed.length}</p>
        </div>
        <div className="bg-[#161616] border border-[#F59E0B]/30 rounded-xl p-4">
          <p className="text-xs text-[#6B7280] mb-1">DS Rejected</p>
          <p className="text-2xl font-bold text-[#F59E0B]">{dsRejected.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* TS Unqualified */}
        <div>
          <h2 className="text-sm font-semibold text-[#F26161] mb-3 uppercase tracking-wide">
            TS Unqualified
          </h2>
          <div className="space-y-3">
            {tsDismissed.length === 0 ? (
              <p className="text-xs text-[#4B5563] italic">None</p>
            ) : (
              tsDismissed.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
                    </div>
                    <ChannelBadge channel={lead.channel} />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex gap-2">
                      <span className="text-[#6B7280]">Agent:</span>
                      <span className="text-[#9CA3AF]">
                        {(lead as { profiles_telesales?: { full_name: string } }).profiles_telesales
                          ?.full_name ?? '—'}
                      </span>
                    </div>
                    {lead.unqualification_reason && (
                      <div className="flex gap-2">
                        <span className="text-[#6B7280]">Reason:</span>
                        <span className="text-[#F26161]">
                          {lead.unqualification_reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {lead.tele_notes && (
                      <p className="text-[#6B7280] italic mt-1">{lead.tele_notes}</p>
                    )}
                    <p className="text-[#4B5563]">
                      {format(parseISO(lead.updated_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DS Rejected */}
        <div>
          <h2 className="text-sm font-semibold text-[#F59E0B] mb-3 uppercase tracking-wide">
            DS Rejected
          </h2>
          <div className="space-y-3">
            {dsRejected.length === 0 ? (
              <p className="text-xs text-[#4B5563] italic">None</p>
            ) : (
              dsRejected.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
                    </div>
                    <ChannelBadge channel={lead.channel} />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex gap-2">
                      <span className="text-[#6B7280]">DS Agent:</span>
                      <span className="text-[#9CA3AF]">
                        {(lead as { profiles_direct_sales?: { full_name: string } })
                          .profiles_direct_sales?.full_name ?? '—'}
                      </span>
                    </div>
                    {lead.unqualification_reason && (
                      <div className="flex gap-2">
                        <span className="text-[#6B7280]">Reason:</span>
                        <span className="text-[#F59E0B]">
                          {lead.unqualification_reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {lead.ds_notes && (
                      <p className="text-[#6B7280] italic mt-1">{lead.ds_notes}</p>
                    )}
                    <p className="text-[#4B5563]">
                      {format(parseISO(lead.updated_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
