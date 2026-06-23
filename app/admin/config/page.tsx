import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OccupationConfig from '@/components/admin/OccupationConfig'

export default async function AdminConfigPage() {
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
