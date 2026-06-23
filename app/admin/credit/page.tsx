import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreditQueue from '@/components/admin/CreditQueue'
import { isPreviewMode, MOCK_LEADS } from '@/lib/preview'

export default async function CreditPage() {
  if (isPreviewMode()) {
    const leads = MOCK_LEADS.filter((l) => l.stage === 'credit_submitted')
    return <CreditQueue initialLeads={leads} />
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('stage', 'credit_submitted')
    .order('direct_sales_assigned_at', { ascending: true })

  return <CreditQueue initialLeads={leads ?? []} />
}
