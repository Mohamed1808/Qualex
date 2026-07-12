'use client'

/** A pulsing gray placeholder block. Compose into row/card skeletons below. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#e5e7eb] ${className}`} />
}

/** Skeleton for a <tr> matching the app's table row height/padding. */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-[#e5e7eb] last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  )
}

/** A block of table-row skeletons, for use inside <tbody>. */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  )
}

/** Skeleton for a card-style list item (e.g. Credit queue, WhatsApp list). */
export function CardSkeleton() {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}
