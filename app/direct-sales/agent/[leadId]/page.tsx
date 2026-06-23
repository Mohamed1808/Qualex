import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DSQualificationForm from '@/components/direct-sales/DSQualificationForm'
import LeadHistoryTimeline from '@/components/shared/LeadHistoryTimeline'
import { isPreviewMode, MOCK_USER, MOCK_LEADS, MOCK_OCCUPATIONS } from '@/lib/preview'

interface Props {
  params: { leadId: string }
}

export default async function DSLeadDetailPage({ params }: Props) {
  if (isPreviewMode()) {
    const lead = MOCK_LEADS.find((l) => l.id === params.leadId) ?? MOCK_LEADS[0]
    return (
      <DSQualificationForm
        lead={lead}
        tsAttempts={[]}
        dsAttempts={[]}
        occupations={MOCK_OCCUPATIONS}
        agentId={MOCK_USER.id}
      />
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [leadResult, attemptsResult, occupationsResult, historyResult] = await Promise.all([
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
    supabase
      .from('lead_stage_history')
      .select('id, from_stage, to_stage, changed_at, note, changed_by_profile:profiles!lead_stage_history_changed_by_fkey(full_name, role)')
      .eq('lead_id', params.leadId)
      .order('changed_at', { ascending: true }),
  ])

  if (leadResult.error || !leadResult.data) notFound()

  const tsAttempts = attemptsResult.data?.filter((a) => a.stage === 'telesales') ?? []
  const dsAttempts = attemptsResult.data?.filter((a) => a.stage === 'direct_sales') ?? []

  return (
    <div className="space-y-6">
      <DSQualificationForm
        lead={leadResult.data}
        tsAttempts={tsAttempts}
        dsAttempts={dsAttempts}
        occupations={occupationsResult.data ?? []}
        agentId={user.id}
      />
      <div className="px-6 pb-6 max-w-4xl mx-auto">
        <LeadHistoryTimeline history={(historyResult.data as never) ?? []} />
      </div>
    </div>
  )
}
