import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChannelBadge from '@/components/shared/ChannelBadge'
import { format, parseISO } from 'date-fns'
import type { ChannelHistoryEntry } from '@/types/database'
import { isPreviewMode, MOCK_LEADS } from '@/lib/preview'

export default async function DSDuplicatesPage() {
  if (isPreviewMode()) {
    const duplicates = MOCK_LEADS.filter((l) => l.is_duplicate)
    const originals = MOCK_LEADS.filter((l) => !l.is_duplicate && l.channel_history.length > 0)

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Duplicate Leads Report</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{duplicates.length} duplicate entries</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#161616] border border-[#F59E0B]/30 rounded-xl p-4">
            <p className="text-xs text-[#6B7280] mb-1">Total Duplicates</p>
            <p className="text-2xl font-bold text-[#F59E0B]">{duplicates.length}</p>
          </div>
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-[#6B7280] mb-1">Multi-Channel Leads</p>
            <p className="text-2xl font-bold text-white">{originals.length}</p>
          </div>
        </div>
        {originals.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white mb-3">Multi-Channel Leads</h2>
            <div className="space-y-3">
              {originals.map((lead) => {
                const history = lead.channel_history as ChannelHistoryEntry[]
                return (
                  <div key={lead.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-white">{lead.name}</p>
                        <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
                      </div>
                      <span className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded">{history.length + 1} touchpoints</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                        <ChannelBadge channel={lead.channel} />
                        <span className="text-xs text-[#6B7280]">Original</span>
                      </div>
                      {history.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                          <ChannelBadge channel={entry.channel} />
                          <span className="text-xs text-[#6B7280]">{format(parseISO(entry.captured_at), 'MMM d, h:mm a')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {['Name', 'Phone', 'Channel', 'Original Lead', 'Submitted'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {duplicates.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[#4B5563] text-sm">No duplicates found</td></tr>
              ) : (
                duplicates.map((lead) => (
                  <tr key={lead.id} className="border-b border-[#2a2a2a] last:border-0">
                    <td className="px-4 py-3 text-white">{lead.name}</td>
                    <td className="px-4 py-3 text-[#9CA3AF] font-mono text-xs">{lead.phone}</td>
                    <td className="px-4 py-3"><ChannelBadge channel={lead.channel} /></td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs font-mono">{lead.duplicate_of?.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs">{format(parseISO(lead.created_at), 'MMM d, HH:mm')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: duplicates } = await supabase
    .from('leads')
    .select('*')
    .eq('is_duplicate', true)
    .order('created_at', { ascending: false })

  const { data: originals } = await supabase
    .from('leads')
    .select('*')
    .neq('channel_history', '[]')
    .eq('is_duplicate', false)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Duplicate Leads Report</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {duplicates?.length ?? 0} duplicate entries
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#161616] border border-[#F59E0B]/30 rounded-xl p-4">
          <p className="text-xs text-[#6B7280] mb-1">Total Duplicates</p>
          <p className="text-2xl font-bold text-[#F59E0B]">{duplicates?.length ?? 0}</p>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-xs text-[#6B7280] mb-1">Multi-Channel Leads</p>
          <p className="text-2xl font-bold text-white">{originals?.length ?? 0}</p>
        </div>
      </div>

      {originals && originals.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Multi-Channel Leads</h2>
          <div className="space-y-3">
            {originals.map((lead) => {
              const history = lead.channel_history as ChannelHistoryEntry[]
              return (
                <div key={lead.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
                    </div>
                    <span className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded">
                      {history.length + 1} touchpoints
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                      <ChannelBadge channel={lead.channel} />
                      <span className="text-xs text-[#6B7280]">Original</span>
                    </div>
                    {history.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <ChannelBadge channel={entry.channel} />
                        <span className="text-xs text-[#6B7280]">
                          {format(parseISO(entry.captured_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              {['Name', 'Phone', 'Channel', 'Original Lead', 'Submitted'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!duplicates || duplicates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#4B5563] text-sm">
                  No duplicates found
                </td>
              </tr>
            ) : (
              duplicates.map((lead) => (
                <tr key={lead.id} className="border-b border-[#2a2a2a] last:border-0">
                  <td className="px-4 py-3 text-white">{lead.name}</td>
                  <td className="px-4 py-3 text-[#9CA3AF] font-mono text-xs">{lead.phone}</td>
                  <td className="px-4 py-3"><ChannelBadge channel={lead.channel} /></td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs font-mono">
                    {lead.duplicate_of?.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">
                    {format(parseISO(lead.created_at), 'MMM d, HH:mm')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
