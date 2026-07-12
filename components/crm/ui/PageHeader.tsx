'use client'

import Link from 'next/link'

interface Crumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  crumbs: Crumb[]
  title: string
  subtitle?: string
  action?: React.ReactNode
}

/** Shared page header: breadcrumb trail + title + optional subtitle/action slot. */
export default function PageHeader({ crumbs, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div className="min-w-0">
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-1.5" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#d1d5db]">/</span>}
              {c.href ? (
                <Link href={c.href} className="hover:text-[#111827] transition-colors">{c.label}</Link>
              ) : (
                <span className="text-[#4B5563]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-xl font-semibold text-[#111827] truncate">{title}</h1>
        {subtitle && <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
