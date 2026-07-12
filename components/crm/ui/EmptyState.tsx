'use client'

interface EmptyStateProps {
  icon?: string
  title: string
  hint?: string
  action?: { label: string; onClick: () => void }
}

/** Reusable empty state for lists/tables with nothing to show. */
export default function EmptyState({ icon = '📭', title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-3xl mb-2 opacity-70">{icon}</div>
      <p className="text-sm font-medium text-[#374151]">{title}</p>
      {hint && <p className="text-xs text-[#6B7280] mt-1 max-w-xs">{hint}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-xs font-medium bg-[#5757e6] hover:bg-[#4444cc] text-white rounded-lg px-4 py-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/** Same, but as a <tr> for direct use inside a <tbody>. */
export function EmptyRow({ colSpan, title, hint }: { colSpan: number; title: string; hint?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-0">
        <EmptyState title={title} hint={hint} />
      </td>
    </tr>
  )
}
