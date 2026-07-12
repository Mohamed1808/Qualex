import { Suspense } from 'react'
import SupervisorQueue from '@/components/crm/SupervisorQueue'

export default function DirectSalesQueuePage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#6B7280]">Loading…</div>}>
      <SupervisorQueue team="direct_sales" />
    </Suspense>
  )
}
