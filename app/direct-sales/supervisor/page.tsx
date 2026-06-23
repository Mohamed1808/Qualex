import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DSSupervisorQueue from '@/components/direct-sales/DSSupervisorQueue'
import { isPreviewMode, MOCK_LEADS, MOCK_PROFILES } from '@/lib/preview'

export default async function DSSupervisorPage() {
  if (isPreviewMode()) {
    const dsLeads = MOCK_LEADS.filter((l) =>
      ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'].includes(l.stage)
    )
    const dsAgents = MOCK_PROFILES.filter((p) => p.role === 'direct_sales_agent')
    return (
      <DSSupervisorQueue
        initialLeads={dsLeads}
        agents={dsAgents}
      />
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [leadsResult, agentsResult] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        *,
        profiles_telesales:profiles!leads_assigned_telesales_agent_fkey(id, full_name, role),
        profiles_direct_sales:profiles!leads_assigned_direct_sales_agent_fkey(id, full_name, role)
      `)
      .in('stage', ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'])
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active, is_on_break')
      .eq('role', 'direct_sales_agent')
      .eq('is_active', true),
  ])

  return (
    <DSSupervisorQueue
      initialLeads={leadsResult.data ?? []}
      agents={agentsResult.data ?? []}
    />
  )
}
