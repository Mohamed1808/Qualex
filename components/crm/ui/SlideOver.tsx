'use client'

interface SlideOverProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  widthClass?: string
}

/** Right-side slide-over panel for larger forms (replaces cramped centered modals). */
export default function SlideOver({ title, onClose, children, footer, widthClass = 'max-w-xl' }: SlideOverProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div
        className={`bg-white border-l border-[#e5e7eb] w-full ${widthClass} h-full flex flex-col shadow-2xl animate-[slideIn_0.2s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-[#6B7280] hover:text-[#111827] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[#e5e7eb] flex gap-2 sticky bottom-0 bg-white">{footer}</div>}
      </div>
    </div>
  )
}
