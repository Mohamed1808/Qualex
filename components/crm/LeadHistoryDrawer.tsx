'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmLead, LeadComment, LeadHistoryEntry, ActivityCategory } from '@/lib/crm/types'
import { listComments, listHistory, addComment, listActivityLog } from '@/lib/crm/service'
import { Skeleton } from './ui/Skeleton'

const TYPE_ICON: Record<LeadHistoryEntry['type'], string> = {
  created: '✨', status_change: '🏷️', assignment: '🎯', comment: '💬', contact: '📞',
}

const ACTIVITY_ICON: Record<ActivityCategory, string> = {
  attendance: '🕒', call_attempt: '📞', qualify: '✅', disposition: '🏷️',
  kyc_update: '📝', reminder: '⏰',
  reassignment: '🔁', assignment: '🎯', comment: '💬',
}

// A single log line the drawer renders, sourced from either the generic lead
// history (created/status/assignment/comment/contact) or the fuller agent
// activity log (which additionally carries the actor's role and reminders).
interface LogLine {
  id: string
  at: string
  actor_name: string
  icon: string
  detail: string
}

export default function LeadHistoryDrawer({
  lead, currentUser, onClose,
}: {
  lead: CrmLead
  currentUser: { id: string; name: string }
  onClose: () => void
}) {
  const [tab, setTab] = useState<'timeline' | 'comments'>('timeline')
  const [comments, setComments] = useState<LeadComment[]>([])
  const [log, setLog] = useState<LogLine[]>([])
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [c, h, a] = await Promise.all([listComments(lead.id), listHistory(lead.id), listActivityLog({ lead_id: lead.id })])
    setComments(c)
    // The activity log is the fuller record (adds actor role + reminders); the generic
    // history log only adds entries that have no activity-log counterpart, like "Lead created".
    const activityTexts = new Set(a.map((x) => x.action))
    const fromActivity: LogLine[] = a.map((x) => ({ id: x.id, at: x.at, actor_name: x.user_name, icon: ACTIVITY_ICON[x.category], detail: x.action }))
    const fromHistoryOnly: LogLine[] = h.filter((x) => !activityTexts.has(x.detail)).map((x) => ({ id: x.id, at: x.at, actor_name: x.actor_name, icon: TYPE_ICON[x.type], detail: x.detail }))
    setLog([...fromActivity, ...fromHistoryOnly].sort((x, y) => y.at.localeCompare(x.at)))
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [lead.id])

  async function submit() {
    if (!body.trim()) return
    setSaving(true)
    await addComment(lead.id, currentUser.id, currentUser.name, body.trim())
    setBody('')
    setSaving(false)
    toast.success('Comment added')
    reload()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white border-l border-[#e5e7eb] w-full max-w-md h-full flex flex-col shadow-2xl animate-[slideIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">{lead.name}</h3>
            <p className="text-xs text-[#6B7280] font-mono">{lead.phone}</p>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e5e7eb]">
          {(['timeline', 'comments'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'text-[#5757e6] border-[#5757e6]' : 'text-[#6B7280] border-transparent hover:text-[#111827]'
              }`}>
              {t === 'timeline' ? 'History' : `Comments (${comments.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-2/3 mt-4" /><Skeleton className="h-3 w-1/3" />
            </div>
          ) : tab === 'timeline' ? (
            log.length === 0 ? (
              <p className="text-xs text-[#4B5563]">No history yet.</p>
            ) : (
              <ol className="relative border-l border-[#e5e7eb] ml-2">
                {log.map((h) => (
                  <li key={h.id} className="mb-4 ml-4">
                    <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-[8px]">
                      {h.icon}
                    </span>
                    <p className="text-xs text-[#111827]">{h.detail}</p>
                    <p className="text-[10px] text-[#4B5563] mt-0.5">
                      {new Date(h.at).toLocaleString()} · {h.actor_name}
                    </p>
                  </li>
                ))}
              </ol>
            )
          ) : (
            comments.length === 0 ? (
              <p className="text-xs text-[#4B5563]">No comments yet. Add the first one below.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="bg-[#f3f4f6] rounded-lg p-3">
                    <p className="text-xs text-[#111827]">{c.body}</p>
                    <p className="text-[10px] text-[#4B5563] mt-1">{c.author_name} · {new Date(c.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Add comment */}
        <div className="p-4 border-t border-[#e5e7eb]">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2}
            placeholder="Add a comment / contact note…"
            className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
          <button onClick={submit} disabled={saving || !body.trim()}
            className="mt-2 w-full bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2">
            {saving ? 'Saving…' : 'Add comment'}
          </button>
        </div>
      </div>
    </div>
  )
}
