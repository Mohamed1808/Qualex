import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserManagement from '@/components/admin/UserManagement'
import { isPreviewMode, MOCK_PROFILES } from '@/lib/preview'

export default async function AdminUsersPage() {
  if (isPreviewMode()) {
    return <UserManagement profiles={MOCK_PROFILES} />
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  return <UserManagement profiles={profiles ?? []} />
}
