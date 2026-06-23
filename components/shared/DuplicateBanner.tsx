import type { ChannelHistoryEntry, LeadChannel } from '@/types/database'
import ChannelBadge from './ChannelBadge'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface DuplicateBannerProps {
  channelHistory: ChannelHistoryEntry[]
  originalChannel: LeadChannel
  className?: string
}

export default function DuplicateBanner({
  channelHistory,
  originalChannel,
  className = '',
}: DuplicateBannerProps) {
  const allTouchpoints: Array<{ channel: LeadChannel; captured_at: string; source: string | null; isOriginal: boolean }> = [
    { channel: originalChannel, captured_at: '', source: null, isOriginal: true },
    ...channelHistory.map((e) => ({ ...e, isOriginal: false })),
  ]

  return (
    <div
      className={`bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-[#F59E0B] text-lg flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#F59E0B] mb-2">
            Duplicate Lead Detected
          </p>
          <p className="text-xs text-[#9CA3AF] mb-3">
            This phone number has been captured across multiple channels:
          </p>

          {/* Timeline */}
          <div className="space-y-2">
            {allTouchpoints.map((tp, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full ${tp.isOriginal ? 'bg-[#3B82F6]' : 'bg-[#F59E0B]'}`}
                  />
                  {idx < allTouchpoints.length - 1 && (
                    <div className="absolute top-2 left-[3px] w-[2px] h-4 bg-[#2a2a2a]" />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ChannelBadge channel={tp.channel} />
                  {tp.isOriginal && (
                    <span className="text-xs text-[#3B82F6] font-medium">Original</span>
                  )}
                  {!tp.isOriginal && tp.captured_at && (
                    <span className="text-xs text-[#6B7280]">
                      {formatDistanceToNow(parseISO(tp.captured_at), { addSuffix: true })}
                    </span>
                  )}
                  {tp.source && (
                    <span className="text-xs text-[#6B7280]">via {tp.source}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
