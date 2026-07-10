import { Suspense } from 'react'
import WhatsAppChat from '@/components/crm/WhatsAppChat'

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#6B7280]">Loading…</div>}>
      <WhatsAppChat />
    </Suspense>
  )
}
