'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface NotificationBellProps {
  userId: string
}

const NOTIFICATION_ICONS: Record<string, string> = {
  new_lead_assigned: '📋',
  sla_warning: '⚠️',
  sla_breach: '🚨',
  duplicate_detected: '🔁',
  callback_due: '📞',
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    fetchNotifications()

    // Subscribe to realtime
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
    setLoading(false)
  }

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-[#6B7280] hover:text-white transition-colors rounded-lg hover:bg-[#1c1c22]"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#F26161] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {loading && (
              <div className="py-8 text-center text-xs text-[#6B7280]">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-8 text-center text-xs text-[#6B7280]">
                No notifications yet
              </div>
            )}
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`w-full text-left px-4 py-3 border-b border-[#2a2a2a] last:border-0 hover:bg-[#1c1c22] transition-colors ${
                  !notif.is_read ? 'bg-[#1c1c22]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {NOTIFICATION_ICONS[notif.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${notif.is_read ? 'text-[#6B7280]' : 'text-white'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-[#4B5563] mt-1">
                      {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 bg-[#3B82F6] rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
