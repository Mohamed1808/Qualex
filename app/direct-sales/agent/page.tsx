import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DSAgentLeadQueue from '@/components/direct-sales/DSAgentLeadQueue'

export default async function DSAgentPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
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
    .eq('assigned_direct_sales_agent', user.id)
    .in('stage', ['ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'])
    .order('ds_sla_due_at', { ascending: true })

  return (
    <DSAgentLeadQueue
      userId={user.id}
      role={profile.role}
      initialLeads={leads ?? []}
    />
  )
}
