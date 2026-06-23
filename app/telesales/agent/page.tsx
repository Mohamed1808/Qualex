import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AgentLeadQueue from '@/components/telesales/AgentLeadQueue'

export default async function TeleSalesAgentPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      profiles_telesales:profiles!leads_assigned_telesales_agent_fkey(id, full_name, role),
      profiles_direct_sales:profiles!leads_assigned_direct_sales_agent_fkey(id, full_name, role)
    `)
    .eq('assigned_telesales_agent', user.id)
    .in('stage', ['telesales_assigned', 'telesales_in_progress'])
    .order('tele_sla_due_at', { ascending: true })

  return (
    <AgentLeadQueue
      userId={user.id}
      role={profile.role}
      initialLeads={leads ?? []}
    />
  )
}
