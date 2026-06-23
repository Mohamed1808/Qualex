import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeleSalesShell from '@/components/telesales/TeleSalesShell'

export default async function TeleSalesLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const { data: attendance } = await supabase
    .from('daily_attendance')
    .select('*')
    .eq('agent_id', user.id)
    .eq('date', today)
    .single()

  return (
    <TeleSalesShell profile={profile} initialAttendance={attendance ?? null}>
      {children}
    </TeleSalesShell>
  )
}
