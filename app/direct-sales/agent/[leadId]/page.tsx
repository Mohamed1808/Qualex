import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DSQualificationForm from '@/components/direct-sales/DSQualificationForm'

interface Props {
  params: { leadId: string }
}

export default async function DSLeadDetailPage({ params }: Props) {
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
      .order('attempt_number'),
    supabase
      .from('config_occupations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (leadResult.error || !leadResult.data) notFound()

  const tsAttempts = attemptsResult.data?.filter((a) => a.stage === 'telesales') ?? []
  const dsAttempts = attemptsResult.data?.filter((a) => a.stage === 'direct_sales') ?? []

  return (
    <DSQualificationForm
      lead={leadResult.data}
      tsAttempts={tsAttempts}
      dsAttempts={dsAttempts}
      occupations={occupationsResult.data ?? []}
      agentId={user.id}
    />
  )
}
