'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'

export function useNotifications(userId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const queryKey = ['notifications', userId]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data as Notification[]) ?? []
    },
    staleTime: 30_000,
  })

  // Realtime subscription
  useEffect(() => {
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
        () => {
          queryClient.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    queryClient.setQueryData<Notification[]>(queryKey, (old) =>
      old?.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)) ?? []
    )
  }

  async function markAllAsRead() {
    const notifications = query.data ?? []
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    queryClient.setQueryData<Notification[]>(queryKey, (old) =>
      old?.map((n) => ({ ...n, is_read: true })) ?? []
    )
  }

  const unreadCount = (query.data ?? []).filter((n) => !n.is_read).length

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }
}
