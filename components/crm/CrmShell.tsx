'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BrandLogo from '@/components/shared/BrandLogo'

const NAV = [
  { href: '/crm/sales', label: 'Sales Dashboard', icon: '🏠' },
  { href: '/crm/leads', label: 'Lead Management', icon: '❄️' },
  { href: '/crm/assign', label: 'Assign & Distribute', icon: '🎯' },
  { href: '/crm/projects', label: 'Project Management', icon: '🏗️' },
  { href: '/crm/teams', label: 'Team Management', icon: '👥' },
  { href: '/crm/users', label: 'User Management', icon: '🧑‍💼' },
  { href: '/crm/statuses', label: 'Lead Statuses', icon: '🏷️' },
  { href: '/crm/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/crm/profile', label: 'Profile', icon: '⚙️' },
]

export default function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#161616] border-r border-[#2a2a2a]">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-[#2a2a2a]">
          <BrandLogo variant="full" height={26} />
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#5757e6]/15 text-[#5757e6]">
            CRM
          </span>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-[#5757e6]/15 text-[#5757e6] font-medium'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-[#1c1c22]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t border-[#2a2a2a]">
          <p className="text-[10px] text-[#4B5563] leading-relaxed">
            Frontend demo · data in your browser. Backend to be connected.
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-6 h-16 border-b border-[#2a2a2a] bg-[#161616] flex-shrink-0">
          <div className="text-sm text-[#6B7280]">Drive Finance CRM</div>
          <div className="flex items-center gap-4">
            <span className="text-lg" title="Language">🇺🇸</span>
            <span className="text-[#6B7280]" title="Theme">🌙</span>
            <span className="relative text-[#6B7280]" title="Notifications">
              🔔
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#5757e6] rounded-full" />
            </span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#5757e6]/20 flex items-center justify-center text-[#5757e6] text-xs font-bold">
                M
              </div>
              <span className="text-sm text-white">Mohamed Moheb</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  )
}
