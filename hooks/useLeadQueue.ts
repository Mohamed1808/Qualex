'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/types/database'

interface UseLeadQueueOptions {
  userId: string
  role: string
  initialData?: Lead[]
}

export function useLeadQueue({ userId, role, initialData }: UseLeadQueueOptions) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const queryKey = ['leads', userId, role]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('leads')
        .select(`
          *,
          profiles_telesales:profiles!leads_assigned_telesales_agent_fkey(id, full_name, role),
          profiles_direct_sales:profiles!leads_assigned_direct_sales_agent_fkey(id, full_name, role)
        `)

      if (role === 'telesales_agent') {
        q = q
          .eq('assigned_telesales_agent', userId)
          .in('stage', ['telesales_assigned', 'telesales_in_progress'])
      } else if (role === 'telesales_supervisor') {
        q = q.in('stage', ['new', 'telesales_assigned', 'telesales_in_progress'])
      } else if (role === 'direct_sales_agent') {
        q = q
          .eq('assigned_direct_sales_agent', userId)
          .in('stage', ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'])
      } else if (role === 'direct_sales_supervisor') {
        q = q.in('stage', ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'])
      } else if (role === 'admin') {
        // Admin sees all
      }

      q = q.order('tele_sla_due_at', { ascending: true, nullsFirst: false })

      const { data, error } = await q
      if (error) throw error
      return (data as Lead[]) ?? []
    },
    initialData,
    staleTime: 30_000,
  })

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`lead-queue:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
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

  return query
}
