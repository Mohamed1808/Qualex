'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CrmLead, LeadStatus, WhatsAppMessage } from '@/lib/crm/types'
import { listLeads, listStatuses, listWhatsApp, sendWhatsApp } from '@/lib/crm/service'
import { COMPANY_WHATSAPP_NUMBER } from '@/lib/crm/mock-data'

const QUICK_REPLIES = [
  'Thanks for reaching out! How can I help?',
  'One moment while I check that for you.',
  'Could you share your preferred budget range?',
  "I'll follow up with you shortly.",
]

const READ_KEY = 'qualex-crm-wa-read-counts'
function getReadCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(window.localStorage.getItem(READ_KEY) ?? '{}') } catch { return {} }
}
function setReadCount(leadId: string, count: number) {
  if (typeof window === 'undefined') return
  const map = getReadCounts()
  map[leadId] = count
  window.localStorage.setItem(READ_KEY, JSON.stringify(map))
}

export default function WhatsAppChat() {
  const params = useSearchParams()
  const initialLead = params.get('lead')
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [activeId, setActiveId] = useState<string | null>(initialLead)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(!!initialLead)

  useEffect(() => {
    Promise.all([listLeads(), listStatuses()]).then(([l, s]) => {
      setLeads(l); setStatuses(s)
      if (!activeId && l.length) setActiveId(l[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeId) {
      listWhatsApp(activeId).then((m) => {
        setMessages(m)
        setReadCount(activeId, m.length)
        setUnread((u) => ({ ...u, [activeId]: 0 }))
      })
    }
  }, [activeId])

  // Compute unread counts for the conversation list (messages received after last read)
  useEffect(() => {
    let cancelled = false
    async function computeUnread() {
      const counts = getReadCounts()
      const result: Record<string, number> = {}
      for (const l of leads) {
        if (l.id === activeId) continue
        const msgs = await listWhatsApp(l.id)
        const inbound = msgs.filter((m) => m.direction === 'in').length
        const readSoFar = counts[l.id] ?? 0
        result[l.id] = Math.max(0, inbound - readSoFar)
      }
      if (!cancelled) setUnread((u) => ({ ...u, ...result }))
    }
    if (leads.length) computeUnread()
    return () => { cancelled = true }
  }, [leads, activeId])

  const statusById = useMemo(() => Object.fromEntries(statuses.map((s) => [s.id, s])), [statuses])
  const active = leads.find((l) => l.id === activeId) || null
  const filtered = leads.filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search))

  async function send(text?: string) {
    const body = (text ?? draft).trim()
    if (!body || !activeId) return
    const msg = await sendWhatsApp(activeId, body)
    setMessages((m) => [...m, msg])
    setReadCount(activeId, messages.length + 1)
    setDraft('')
  }

  function selectLead(id: string) {
    setActiveId(id)
    setShowThreadOnMobile(true)
  }

  return (
    <div className="flex h-full">
      {/* Conversations list */}
      <div className={`w-full sm:w-72 border-r border-[#e5e7eb] flex-col bg-white flex-shrink-0 ${showThreadOnMobile ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#e5e7eb]">
          <h2 className="text-sm font-semibold text-[#111827] mb-2">Messages</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chat"
            className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.map((l) => {
            const status = l.status_id ? statusById[l.status_id] : undefined
            const unreadCount = unread[l.id] ?? 0
            return (
              <button key={l.id} onClick={() => selectLead(l.id)}
                className={`w-full text-left px-4 py-3 border-b border-[#e5e7eb] flex items-center gap-3 transition-colors ${activeId === l.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f3f4f6]'}`}>
                <div className="w-9 h-9 rounded-full bg-[#5757e6]/20 flex items-center justify-center text-[#5757e6] text-sm font-bold flex-shrink-0">{l.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#111827] truncate">{l.name}</p>
                  <p className="text-[10px] truncate" style={{ color: status?.color ?? '#6B7280' }}>{status?.name ?? 'No status'}</p>
                </div>
                {unreadCount > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#22C55E] text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex-col bg-[#f7f8fa] min-w-0 ${showThreadOnMobile ? 'flex' : 'hidden sm:flex'}`}>
        {active ? (
          <>
            <div className="px-4 sm:px-5 py-3 border-b border-[#e5e7eb] bg-white flex items-center gap-3">
              <button onClick={() => setShowThreadOnMobile(false)} className="sm:hidden text-[#6B7280] hover:text-[#111827] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] flex-shrink-0">←</button>
              <div className="w-9 h-9 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] flex-shrink-0">💬</div>
              <div className="min-w-0">
                <p className="text-sm text-[#111827] font-medium truncate">{active.name} · <span className="font-mono text-xs text-[#4B5563]">{active.phone}</span></p>
                <p className="text-[10px] text-[#6B7280] truncate">Company WhatsApp · {COMPANY_WHATSAPP_NUMBER}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-xs text-[#4B5563] mt-8">No messages yet. Start the conversation below.</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.direction === 'out' ? 'bg-[#5757e6] text-white' : 'bg-[#f3f4f6] text-[#1f2937]'}`}>
                    {m.body}
                    <span className="flex items-center gap-1 text-[9px] opacity-60 mt-1">
                      {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'out' && <span title="Delivered">✓✓</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick replies */}
            <div className="px-4 sm:px-6 pt-2 flex gap-2 overflow-x-auto scrollbar-thin">
              {QUICK_REPLIES.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="flex-shrink-0 text-xs whitespace-nowrap bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#4B5563] rounded-full px-3 py-1.5 transition-colors">
                  {q.length > 30 ? q.slice(0, 30) + '…' : q}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-[#e5e7eb] bg-white flex items-center gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Type your message here…"
                className="flex-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
              <button onClick={() => send()} aria-label="Send" className="w-10 h-10 rounded-full bg-[#5757e6] hover:bg-[#4444cc] text-white flex items-center justify-center flex-shrink-0 transition-colors">➤</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#4B5563] text-sm">Select a conversation</div>
        )}
      </div>
    </div>
  )
}
