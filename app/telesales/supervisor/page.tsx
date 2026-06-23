import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TSSupervisorQueue from '@/components/telesales/TSSupervisorQueue'
import { isPreviewMode, MOCK_LEADS, MOCK_PROFILES } from '@/lib/preview'

export default async function TSSupervisorPage() {
  if (isPreviewMode()) {
    const tsAgents = MOCK_PROFILES.filter((p) => p.role === 'telesales_agent')
    return (
      <TSSupervisorQueue
        initialLeads={MOCK_LEADS}
        agents={tsAgents}
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
      .in('stage', ['new', 'telesales_assigned', 'telesales_in_progress'])
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active, is_on_break')
      .eq('role', 'telesales_agent')
      .eq('is_active', true),
  ])

  return (
    <TSSupervisorQueue
      initialLeads={leadsResult.data ?? []}
      agents={agentsResult.data ?? []}
    />
  )
}
