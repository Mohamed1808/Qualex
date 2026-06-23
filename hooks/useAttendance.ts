'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { DailyAttendance } from '@/types/database'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { checkIn, startBreak, endBreak, checkOut } from '@/actions/attendance'
import { toast } from 'sonner'

const CAIRO_TZ = 'Africa/Cairo'

export function useAttendance(userId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const today = format(toZonedTime(new Date(), CAIRO_TZ), 'yyyy-MM-dd')
  const queryKey = ['attendance', userId, today]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('agent_id', userId)
        .eq('date', today)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return (data as DailyAttendance | null) ?? null
    },
    staleTime: 10_000,
  })

  async function runAction(action: () => Promise<{ error?: string }>, successMsg: string) {
    const result = await action()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(successMsg)
      queryClient.invalidateQueries({ queryKey })
    }
  }

  return {
    attendance: query.data,
    isLoading: query.isLoading,
    checkIn: () => runAction(checkIn, 'Checked in!'),
    startBreak: () => runAction(startBreak, 'Break started'),
    endBreak: () => runAction(endBreak, 'Break ended'),
    checkOut: () => runAction(checkOut, 'Checked out. Have a great day!'),
    refetch: query.refetch,
  }
}
