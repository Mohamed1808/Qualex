import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManualLeadIntake from '@/components/admin/ManualLeadIntake'

export default async function AdminPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recentLeads } = await supabase
    .from('leads')
    .select(`
      *,
      profiles_telesales:profiles!leads_assigned_telesales_agent_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return <ManualLeadIntake recentLeads={recentLeads ?? []} />
}
