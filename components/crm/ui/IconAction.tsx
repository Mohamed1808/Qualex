'use client'

interface IconActionProps {
  label: string
  onClick?: () => void
  href?: string
  target?: string
  rel?: string
  bg: string
  color?: string
  disabled?: boolean
  children: React.ReactNode
}

/**
 * A round quick-action button (call, WhatsApp, Facebook, reminder…) with a
 * larger 36px tap target (was 28px) and a visible tooltip on hover/focus.
 */
export default function IconAction({ label, onClick, href, target, rel, bg, color = '#ffffff', disabled, children }: IconActionProps) {
  const cls = `group relative w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#5757e6] ${
    disabled ? 'opacity-40 pointer-events-none' : 'hover:scale-105 active:scale-95'
  }`
  const style = { backgroundColor: bg, color }
  const tooltip = (
    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 z-10">
      {label}
    </span>
  )

  if (href) {
    return (
      <a href={href} target={target} rel={rel} aria-label={label} className={cls} style={style}>
        {tooltip}
        {children}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls} style={style} disabled={disabled}>
      {tooltip}
      {children}
    </button>
  )
}
