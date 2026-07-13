'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AppNotification } from '@/lib/crm/types'
import { listNotifications, markNotificationRead, markAllNotificationsRead, runNotificationSweep, NOTIFICATIONS_EVENT } from '@/lib/crm/service'

const TYPE_ICON: Record<AppNotification['type'], string> = {
  lead_assigned: '🎯',
  lead_reassigned: '🔁',
  callback_due: '📞',
  reminder_due: '🔔',
  new_unassigned_lead: '❄️',
  lead_auto_terminated: '⛔',
  qualified_to_ds: '✅',
  credit_submitted: '🏦',
  credit_decision: '📋',
  duplicate_detected: '👥',
}

const SWEEP_INTERVAL_MS = 30_000

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const [alertQueue, setAlertQueue] = useState<AppNotification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef<Set<string>>(new Set())
  const firstLoad = useRef(true)

  const reload = useCallback(async () => {
    const rows = await listNotifications(userId)
    // Surface anything new & unread since the last time we checked (skip the very first load).
    // Scheduled-callback alerts get a blocking centered modal instead of a toast — they need
    // to interrupt the agent, not get lost in the corner.
    if (!firstLoad.current) {
      for (const n of rows) {
        if (!seenIds.current.has(n.id) && !n.is_read) {
          if (n.type === 'callback_due') {
            setAlertQueue((q) => (q.some((x) => x.id === n.id) ? q : [...q, n]))
          } else {
            toast(n.title, { description: n.message, icon: TYPE_ICON[n.type] })
          }
        }
      }
    }
    firstLoad.current = false
    seenIds.current = new Set(rows.map((n) => n.id))
    setItems(rows)
  }, [userId])

  useEffect(() => {
    reload()
    const onUpdate = () => reload()
    window.addEventListener(NOTIFICATIONS_EVENT, onUpdate)
    window.addEventListener('storage', onUpdate) // cross-tab
    const sweep = setInterval(() => runNotificationSweep(), SWEEP_INTERVAL_MS)
    runNotificationSweep() // catch anything already overdue on mount
    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, onUpdate)
      window.removeEventListener('storage', onUpdate)
      clearInterval(sweep)
    }
  }, [reload])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const unreadCount = items.filter((n) => !n.is_read).length

  async function handleClick(n: AppNotification) {
    if (!n.is_read) await markNotificationRead(n.id)
    setOpen(false)
    if (n.link) router.push(n.link)
    reload()
  }

  async function handleMarkAll() {
    await markAllNotificationsRead(userId)
    reload()
  }

  const activeAlert = alertQueue[0] ?? null

  async function dismissAlert(goToLead: boolean) {
    if (!activeAlert) return
    await markNotificationRead(activeAlert.id)
    setAlertQueue((q) => q.slice(1))
    if (goToLead && activeAlert.link) router.push(activeAlert.link)
    reload()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F26161] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white border border-[#e5e7eb] rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-semibold text-[#111827]">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-[#5757e6] hover:text-[#4444cc]">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <p className="text-xs text-[#6B7280] text-center py-8">No notifications yet.</p>
            ) : items.slice(0, 30).map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-[#e5e7eb] last:border-0 flex gap-3 transition-colors hover:bg-[#f3f4f6] ${!n.is_read ? 'bg-[#5757e6]/5' : ''}`}
              >
                <span className="text-base flex-shrink-0">{TYPE_ICON[n.type]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`text-xs ${n.is_read ? 'text-[#4B5563]' : 'text-[#111827] font-semibold'}`}>{n.title}</span>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#5757e6] flex-shrink-0" />}
                  </span>
                  <span className="block text-xs text-[#6B7280] truncate">{n.message}</span>
                  <span className="block text-[10px] text-[#9CA3AF] mt-0.5">{new Date(n.created_at).toLocaleString()}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center animate-[slideIn_0.2s_ease-out]">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#F26161]/10 flex items-center justify-center text-3xl mb-4">
              ⚠️
            </div>
            <h3 className="text-base font-semibold text-[#111827]">{activeAlert.title}</h3>
            <p className="text-sm text-[#4B5563] mt-1.5">{activeAlert.message}</p>
            {alertQueue.length > 1 && (
              <p className="text-[11px] text-[#9CA3AF] mt-2">+{alertQueue.length - 1} more callback(s) due</p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => dismissAlert(false)}
                className="flex-1 border border-[#e5e7eb] text-[#4B5563] hover:bg-[#f3f4f6] text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => dismissAlert(true)}
                className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                View lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
