import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isPreviewMode, MOCK_LEADS, MOCK_PROFILES } from '@/lib/preview'
import ConversionFunnel from '@/components/analytics/ConversionFunnel'
import SLAComplianceChart from '@/components/analytics/SLAComplianceChart'
import ChannelPerformanceChart from '@/components/analytics/ChannelPerformanceChart'
import AgentPerformanceTable from '@/components/analytics/AgentPerformanceTable'
import ScriptQualityChart from '@/components/analytics/ScriptQualityChart'
import { subDays, format } from 'date-fns'

const QUALIFIED_STAGES = [
  'qualified',
  'ds_assigned',
  'ds_in_progress',
  'id_collected',
  'credit_submitted',
  'approved',
  'rejected',
]

export default async function TSAnalyticsPage() {
  if (isPreviewMode()) {
    const leads = MOCK_LEADS
    const tsAgents = MOCK_PROFILES.filter((p) => p.role === 'telesales_agent')

    const funnelData = {
      captured: leads.length,
      tsReached: leads.filter((l) => l.stage !== 'new').length,
      tsQualified: leads.filter((l) => QUALIFIED_STAGES.includes(l.stage)).length,
      dsReached: leads.filter((l) =>
        ['ds_in_progress', 'id_collected', 'credit_submitted', 'approved', 'rejected'].includes(l.stage)
      ).length,
      dsQualified: leads.filter((l) =>
        ['id_collected', 'credit_submitted', 'approved'].includes(l.stage)
      ).length,
      creditSubmitted: leads.filter((l) => ['credit_submitted', 'approved'].includes(l.stage)).length,
      approved: leads.filter((l) => l.stage === 'approved').length,
    }

    const slaData = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i)
      return { date: format(d, 'MMM d'), telesales: 85 + Math.round(Math.random() * 15), directSales: 80 + Math.round(Math.random() * 20) }
    })

    const channelData = [
      { channel: 'WhatsApp', leads: 12, qualificationRate: 58, duplicateRate: 8 },
      { channel: 'Meta', leads: 18, qualificationRate: 44, duplicateRate: 12 },
      { channel: 'Website', leads: 7, qualificationRate: 71, duplicateRate: 3 },
      { channel: 'Call Center', leads: 5, qualificationRate: 60, duplicateRate: 0 },
    ]

    const agentPerformance = tsAgents.map((agent) => ({
      agentId: agent.id,
      agentName: agent.full_name,
      totalLeads: 14,
      qualified: 7,
      unqualified: 4,
      terminated: 1,
      avgCallsToQualify: 1.9,
      slaCompliance: 91,
    }))

    const totalLeads = leads.length
    const totalQualified = leads.filter((l) => QUALIFIED_STAGES.includes(l.stage)).length
    const totalUnqualified = leads.filter((l) => l.stage === 'unqualified').length
    const reached = leads.filter((l) => l.stage !== 'new').length
    const qualRate = reached > 0 ? ((totalQualified / reached) * 100).toFixed(1) : '0.0'

    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Telesales Analytics</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">All-time performance overview</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: totalLeads.toLocaleString(), color: '#5757e6' },
            { label: 'Qualified', value: totalQualified.toLocaleString(), color: '#14B8A6' },
            { label: 'Unqualified', value: totalUnqualified.toLocaleString(), color: '#F26161' },
            { label: 'Qualification Rate', value: `${qualRate}%`, color: '#F59E0B' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-xs text-[#6B7280] mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ConversionFunnel data={funnelData} />
          <SLAComplianceChart data={slaData} />
        </div>
        <ChannelPerformanceChart data={channelData} />
        <AgentPerformanceTable data={agentPerformance} teamType="telesales" />
      </div>
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [allLeadsResult, feedbackResult, agentsResult, attemptsResult] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('script_feedback').select('*').eq('feedback_stage', 'tele_qa'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'telesales_agent')
      .eq('is_active', true),
    supabase.from('call_attempts').select('*'),
  ])

  const leads = allLeadsResult.data ?? []
  const feedback = feedbackResult.data ?? []
  const tsAgents = agentsResult.data ?? []
  const attempts = attemptsResult.data ?? []

  // Conversion funnel
  const funnelData = {
    captured: leads.length,
    tsReached: leads.filter((l) => l.stage !== 'new').length,
    tsQualified: leads.filter((l) => QUALIFIED_STAGES.includes(l.stage)).length,
    dsReached: leads.filter((l) =>
      ['ds_in_progress', 'id_collected', 'credit_submitted', 'approved', 'rejected'].includes(l.stage)
    ).length,
    dsQualified: leads.filter((l) =>
      ['id_collected', 'credit_submitted', 'approved'].includes(l.stage)
    ).length,
    creditSubmitted: leads.filter((l) => ['credit_submitted', 'approved'].includes(l.stage)).length,
    approved: leads.filter((l) => l.stage === 'approved').length,
  }

  // SLA compliance by day (last 14 days)
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i)
    return format(d, 'yyyy-MM-dd')
  })

  const slaData = last14Days.map((date) => {
    const dayLeads = leads.filter((l) => l.created_at?.startsWith(date))
    const tsCompliant = dayLeads.filter((l) => !l.tele_sla_breached && l.tele_sla_due_at).length
    const dsCompliant = dayLeads.filter((l) => !l.ds_sla_breached && l.ds_sla_due_at).length
    const tsTotal = dayLeads.filter((l) => l.tele_sla_due_at).length
    const dsTotal = dayLeads.filter((l) => l.ds_sla_due_at).length
    return {
      date: format(new Date(date), 'MMM d'),
      telesales: tsTotal > 0 ? Math.round((tsCompliant / tsTotal) * 100) : 100,
      directSales: dsTotal > 0 ? Math.round((dsCompliant / dsTotal) * 100) : 100,
    }
  })

  // Channel performance
  const channels = ['whatsapp', 'meta', 'website', 'app', 'call_center'] as const
  const channelData = channels.map((channel) => {
    const channelLeads = leads.filter((l) => l.channel === channel)
    const qualified = channelLeads.filter((l) => QUALIFIED_STAGES.includes(l.stage)).length
    const duplicates = channelLeads.filter((l) => l.is_duplicate).length
    return {
      channel: channel.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      leads: channelLeads.length,
      qualificationRate: channelLeads.length > 0 ? Math.round((qualified / channelLeads.length) * 100) : 0,
      duplicateRate: channelLeads.length > 0 ? Math.round((duplicates / channelLeads.length) * 100) : 0,
    }
  })

  // Telesales agent performance
  const agentPerformance = tsAgents.map((agent) => {
    const agentLeads = leads.filter((l) => l.assigned_telesales_agent === agent.id)
    const qualified = agentLeads.filter(
      (l) => l.tele_disposition === 'qualified' || QUALIFIED_STAGES.includes(l.stage)
    ).length
    const unqualified = agentLeads.filter(
      (l) => l.tele_disposition === 'unqualified' || l.stage === 'unqualified'
    ).length
    const terminated = agentLeads.filter((l) => l.tele_disposition === 'terminated').length
    const agentAttempts = attempts.filter((a) => a.agent_id === agent.id && a.stage === 'telesales')
    const slaLeads = agentLeads.filter((l) => l.tele_sla_due_at)
    const slaCompliant = slaLeads.filter((l) => !l.tele_sla_breached).length
    return {
      agentId: agent.id,
      agentName: agent.full_name,
      totalLeads: agentLeads.length,
      qualified,
      unqualified,
      terminated,
      avgCallsToQualify: qualified > 0 ? agentAttempts.length / qualified : 0,
      slaCompliance: slaLeads.length > 0 ? Math.round((slaCompliant / slaLeads.length) * 100) : 100,
    }
  })

  // Script quality (QA reason codes)
  const reasonCodes: Record<string, number> = {}
  for (const fb of feedback) {
    reasonCodes[fb.reason_code] = (reasonCodes[fb.reason_code] ?? 0) + 1
  }
  const scriptQualityData = Object.entries(reasonCodes)
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Summary stats
  const totalLeads = leads.length
  const totalQualified = leads.filter((l) => QUALIFIED_STAGES.includes(l.stage)).length
  const totalUnqualified = leads.filter((l) => l.stage === 'unqualified').length
  const reached = leads.filter((l) => l.stage !== 'new').length
  const qualRate = reached > 0 ? ((totalQualified / reached) * 100).toFixed(1) : '0.0'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Telesales Analytics</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">All-time performance overview</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: totalLeads.toLocaleString(), color: '#5757e6' },
          { label: 'Qualified', value: totalQualified.toLocaleString(), color: '#14B8A6' },
          { label: 'Unqualified', value: totalUnqualified.toLocaleString(), color: '#F26161' },
          { label: 'Qualification Rate', value: `${qualRate}%`, color: '#F59E0B' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <p className="text-xs text-[#6B7280] mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <ConversionFunnel data={funnelData} />
        <SLAComplianceChart data={slaData} />
      </div>

      <ChannelPerformanceChart data={channelData} />

      <AgentPerformanceTable data={agentPerformance} teamType="telesales" />

      {scriptQualityData.length > 0 && <ScriptQualityChart data={scriptQualityData} />}
    </div>
  )
}
