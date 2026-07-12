import { Suspense } from 'react'
import SalesDashboard from '@/components/crm/SalesDashboard'

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#6B7280]">Loading…</div>}>
      <SalesDashboard />
    </Suspense>
  )
}
