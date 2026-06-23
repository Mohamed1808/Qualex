'use client'

import type { Lead } from '@/types/database'
import ChannelBadge from './ChannelBadge'
import SLATimer from './SLATimer'
import { getSLAStatus } from '@/lib/sla'
import { getStageLabel as getStage } from '@/lib/assignment'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface LeadCardProps {
  lead: Lead
  onClick: () => void
  teamType?: 'telesales' | 'direct_sales'
}

export default function LeadCard({ lead, onClick, teamType = 'telesales' }: LeadCardProps) {
  const slaBreached =
    teamType === 'telesales' ? lead.tele_sla_breached : lead.ds_sla_breached
  const slaDueAt =
    teamType === 'telesales' ? lead.tele_sla_due_at : lead.ds_sla_due_at

  const slaStatus = getSLAStatus(slaDueAt, slaBreached)
  const accentColor = teamType === 'telesales' ? '#3B82F6' : '#14B8A6'

  const borderClass =
    slaStatus === 'breached'
      ? 'border-[#F26161] sla-breached-border'
      : slaStatus === 'warning'
      ? 'border-[#F59E0B]'
      : 'border-[#2a2a2a] hover:border-[#3a3a3a]'

  const agentName =
    teamType === 'telesales'
      ? lead.profiles_telesales?.full_name
      : lead.profiles_direct_sales?.full_name

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-[#161616] border rounded-xl p-4 transition-all hover:bg-[#1a1a1a] cursor-pointer ${borderClass}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white truncate">{lead.name}</h3>
            {lead.is_duplicate && (
              <span className="text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                DUP
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
        </div>
        <ChannelBadge channel={lead.channel} className="flex-shrink-0" />
      </div>

      {/* Car info */}
      {(lead.requested_car_brand || lead.requested_car_year) && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[#6B7280] text-xs">🚗</span>
          <span className="text-xs text-[#9CA3AF]">
            {[lead.requested_car_brand, lead.requested_car_year].filter(Boolean).join(' ')}
          </span>
        </div>
      )}

      {/* Stage badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs px-2 py-0.5 rounded-md font-medium"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {getStage(lead.stage)}
        </span>
        {agentName && (
          <span className="text-xs text-[#6B7280] truncate">→ {agentName}</span>
        )}
      </div>

      {/* Footer: SLA timer + time */}
      <div className="flex items-center justify-between">
        {slaDueAt ? (
          <SLATimer dueAt={slaDueAt} breached={slaBreached} />
        ) : (
          <span className="text-xs text-[#4B5563]">No SLA set</span>
        )}
        <span className="text-[10px] text-[#4B5563]">
          {formatDistanceToNow(parseISO(lead.created_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  )
}
