import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QualificationForm from '@/components/telesales/QualificationForm'

interface Props {
  params: { leadId: string }
}

export default async function LeadDetailPage({ params }: Props) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [leadResult, attemptsResult, occupationsResult] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        *,
        profiles_telesales:profiles!leads_assigned_telesales_agent_fkey(id, full_name, role),
        profiles_direct_sales:profiles!leads_assigned_direct_sales_agent_fkey(id, full_name, role)
      `)
      .eq('id', params.leadId)
      .single(),
    supabase
      .from('call_attempts')
      .select('*')
      .eq('lead_id', params.leadId)
      .eq('stage', 'telesales')
      .order('attempt_number'),
    supabase
      .from('config_occupations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (leadResult.error || !leadResult.data) notFound()

  return (
    <QualificationForm
      lead={leadResult.data}
      initialAttempts={attemptsResult.data ?? []}
      occupations={occupationsResult.data ?? []}
      agentId={user.id}
    />
  )
}
