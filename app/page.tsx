import { redirect } from 'next/navigation'
import { isPreviewMode } from '@/lib/preview'

export default function Home() {
  if (isPreviewMode()) {
    redirect('/telesales/agent')
  }
  redirect('/login')
}
