import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OccupationConfig from '@/components/admin/OccupationConfig'
import { isPreviewMode, MOCK_OCCUPATIONS } from '@/lib/preview'

export default async function AdminConfigPage() {
  if (isPreviewMode()) {
    return <OccupationConfig occupations={MOCK_OCCUPATIONS} />
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: occupations } = await supabase
    .from('config_occupations')
    .select('*')
    .order('sort_order')

  return <OccupationConfig occupations={occupations ?? []} />
}
