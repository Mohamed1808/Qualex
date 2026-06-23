import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManualLeadIntake from '@/components/admin/ManualLeadIntake'
import LeadImport from '@/components/admin/LeadImport'
import { isPreviewMode, MOCK_LEADS } from '@/lib/preview'

export default async function AdminPage() {
  if (isPreviewMode()) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <LeadImport />
        <ManualLeadIntake recentLeads={MOCK_LEADS} />
      </div>
    )
  }

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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <LeadImport />
      <ManualLeadIntake recentLeads={recentLeads ?? []} />
    </div>
  )
}
