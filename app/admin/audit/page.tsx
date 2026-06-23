import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuditLog from '@/components/admin/AuditLog'
import { isPreviewMode } from '@/lib/preview'

export default async function AuditPage() {
  if (isPreviewMode()) {
    return <AuditLog initialRows={[]} />
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('lead_stage_history')
    .select(`
      id, from_stage, to_stage, changed_at, note,
      lead:leads!lead_stage_history_lead_id_fkey(name, phone),
      changed_by_profile:profiles!lead_stage_history_changed_by_fkey(full_name, role)
    `)
    .order('changed_at', { ascending: false })
    .limit(300)

  return <AuditLog initialRows={(rows as never) ?? []} />
}
