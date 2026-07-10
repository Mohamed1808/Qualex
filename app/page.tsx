import { redirect } from 'next/navigation'

// Frontend-only build: the app opens directly into the CRM.
// Backend/auth will be wired up by the team on the company server.
export default function Home() {
  redirect('/crm/sales')
}
