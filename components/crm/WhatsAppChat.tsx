'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CrmLead, LeadStatus, WhatsAppMessage } from '@/lib/crm/types'
import { listLeads, listStatuses, listWhatsApp, sendWhatsApp } from '@/lib/crm/service'
import { COMPANY_WHATSAPP_NUMBER } from '@/lib/crm/mock-data'

export default function WhatsAppChat() {
  const params = useSearchParams()
  const initialLead = params.get('lead')
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [activeId, setActiveId] = useState<string | null>(initialLead)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([listLeads(), listStatuses()]).then(([l, s]) => {
      setLeads(l); setStatuses(s)
      if (!activeId && l.length) setActiveId(l[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (activeId) listWhatsApp(activeId).then(setMessages) }, [activeId])

  const statusById = useMemo(() => Object.fromEntries(statuses.map((s) => [s.id, s])), [statuses])
  const active = leads.find((l) => l.id === activeId) || null
  const filtered = leads.filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search))

  async function send() {
    if (!draft.trim() || !activeId) return
    const msg = await sendWhatsApp(activeId, draft.trim())
    setMessages((m) => [...m, msg])
    setDraft('')
  }

  return (
    <div className="flex h-full">
      {/* Conversations list */}
      <div className="w-72 border-r border-[#2a2a2a] flex flex-col bg-[#161616]">
        <div className="p-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-white mb-2">Messages</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chat"
            className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.map((l) => {
            const status = l.status_id ? statusById[l.status_id] : undefined
            return (
              <button key={l.id} onClick={() => setActiveId(l.id)}
                className={`w-full text-left px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-3 transition-colors ${activeId === l.id ? 'bg-[#1c1c22]' : 'hover:bg-[#1c1c22]'}`}>
                <div className="w-9 h-9 rounded-full bg-[#5757e6]/20 flex items-center justify-center text-[#5757e6] text-sm font-bold flex-shrink-0">{l.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{l.name}</p>
                  <p className="text-[10px] truncate" style={{ color: status?.color ?? '#6B7280' }}>{status?.name ?? 'No status'}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col bg-[#0f0f0f]">
        {active ? (
          <>
            <div className="px-5 py-3 border-b border-[#2a2a2a] bg-[#161616] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366]">💬</div>
              <div>
                <p className="text-sm text-white font-medium">{active.name} · <span className="font-mono text-xs text-[#9CA3AF]">{active.phone}</span></p>
                <p className="text-[10px] text-[#6B7280]">Company WhatsApp · {COMPANY_WHATSAPP_NUMBER}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-xs text-[#4B5563] mt-8">No messages yet. Start the conversation below.</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.direction === 'out' ? 'bg-[#5757e6] text-white' : 'bg-[#1c1c22] text-[#e5e7eb]'}`}>
                    {m.body}
                    <span className="block text-[9px] opacity-60 mt-1">{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#2a2a2a] bg-[#161616] flex items-center gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Type your message here…"
                className="flex-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
              <button onClick={send} className="w-10 h-10 rounded-full bg-[#5757e6] hover:bg-[#4444cc] text-white flex items-center justify-center">➤</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#4B5563] text-sm">Select a conversation</div>
        )}
      </div>
    </div>
  )
}
