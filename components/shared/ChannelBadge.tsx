import type { LeadChannel } from '@/types/database'

interface ChannelBadgeProps {
  channel: LeadChannel
  className?: string
}

const CHANNEL_CONFIG: Record<
  LeadChannel,
  { label: string; emoji: string; color: string; bg: string }
> = {
  whatsapp: {
    label: 'WhatsApp',
    emoji: '💬',
    color: '#25D366',
    bg: 'rgba(37,211,102,0.12)',
  },
  meta: {
    label: 'Meta',
    emoji: '🔵',
    color: '#1877F2',
    bg: 'rgba(24,119,242,0.12)',
  },
  website: {
    label: 'Website',
    emoji: '🌐',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.12)',
  },
  app: {
    label: 'App',
    emoji: '📱',
    color: '#4F46E5',
    bg: 'rgba(79,70,229,0.12)',
  },
  call_center: {
    label: 'Call Center',
    emoji: '📞',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.12)',
  },
}

export default function ChannelBadge({ channel, className = '' }: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channel]
  if (!config) return null

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  )
}
