import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConversionFunnel from '@/components/analytics/ConversionFunnel'
import SLAComplianceChart from '@/components/analytics/SLAComplianceChart'
import ChannelPerformanceChart from '@/components/analytics/ChannelPerformanceChart'
import AgentPerformanceTable from '@/components/analytics/AgentPerformanceTable'
import ScriptQualityChart from '@/components/analytics/ScriptQualityChart'
import { subDays, format } from 'date-fns'

export default async function DSAnalyticsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all needed data in parallel
  const [
    allLeadsResult,
    feedbackResult,
    agentsResult,
    attemptsResult,
  ] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('script_feedback').select('*').eq('feedback_stage', 'ds_override'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'direct_sales_agent')
      .eq('is_active', true),
    supabase.from('call_attempts').select('*'),
  ])

  const leads = allLeadsResult.data ?? []
  const feedback = feedbackResult.data ?? []
  const dsAgents = agentsResult.data ?? []
  const attempts = attemptsResult.data ?? []

  // Conversion funnel
  const funnelData = {
    captured: leads.length,
    tsReached: leads.filter((l) => l.stage !== 'new').length,
    tsQualified: leads.filter((l) =>
      ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted', 'approved', 'rejected'].includes(l.stage)
    ).length,
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
    const qualified = channelLeads.filter((l) =>
      ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted', 'approved'].includes(l.stage)
    ).length
    const duplicates = channelLeads.filter((l) => l.is_duplicate).length
    return {
      channel: channel.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      leads: channelLeads.length,
      qualificationRate: channelLeads.length > 0 ? Math.round((qualified / channelLeads.length) * 100) : 0,
      duplicateRate: channelLeads.length > 0 ? Math.round((duplicates / channelLeads.length) * 100) : 0,
    }
  })

  // DS Agent performance
  const agentPerformance = dsAgents.map((agent) => {
    const agentLeads = leads.filter((l) => l.assigned_direct_sales_agent === agent.id)
    const qualified = agentLeads.filter((l) => l.stage === 'approved' || l.ds_disposition === 'qualified').length
    const unqualified = agentLeads.filter((l) => l.ds_disposition === 'unqualified' || l.stage === 'rejected').length
    const terminated = agentLeads.filter((l) => l.ds_disposition === 'terminated').length
    const agentAttempts = attempts.filter((a) => a.agent_id === agent.id && a.stage === 'direct_sales')
    const slaLeads = agentLeads.filter((l) => l.ds_sla_due_at)
    const slaCompliant = slaLeads.filter((l) => !l.ds_sla_breached).length
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

  // Script quality (rejection reason codes)
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
  const totalApproved = leads.filter((l) => l.stage === 'approved').length
  const totalQualified = leads.filter((l) =>
    ['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted', 'approved'].includes(l.stage)
  ).length
  const overallConversion = totalLeads > 0 ? ((totalApproved / totalLeads) * 100).toFixed(1) : '0.0'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Analytics Dashboard</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">All-time performance overview</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: totalLeads.toLocaleString(), color: '#3B82F6' },
          { label: 'TS Qualified', value: totalQualified.toLocaleString(), color: '#14B8A6' },
          { label: 'Approved', value: totalApproved.toLocaleString(), color: '#22C55E' },
          { label: 'Conversion Rate', value: `${overallConversion}%`, color: '#F59E0B' },
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

      <AgentPerformanceTable data={agentPerformance} teamType="direct_sales" />

      {scriptQualityData.length > 0 && (
        <ScriptQualityChart data={scriptQualityData} />
      )}
    </div>
  )
}
