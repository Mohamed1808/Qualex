'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import BrandLogo from '@/components/shared/BrandLogo'
import { useSession } from '@/lib/crm/session'
import AttendanceControls from './AttendanceControls'

type Audience = 'agent' | 'ts_sup' | 'ds_sup' | 'admin'
type NavItem = { href: string; label: string; icon: string; audiences: Audience[] }
type NavSection = { label: string | null; items: NavItem[] }

// Grouped nav: null-label sections render without a heading (top-level items).
const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: '/crm/sales', label: 'My Queue', icon: '🏠', audiences: ['agent'] },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/crm/telesales/queue', label: 'Telesales Queue', icon: '📞', audiences: ['ts_sup'] },
      { href: '/crm/telesales/analytics', label: 'Telesales Analytics', icon: '📊', audiences: ['ts_sup'] },
      { href: '/crm/direct-sales/queue', label: 'Direct Sales Queue', icon: '🤝', audiences: ['ds_sup'] },
      { href: '/crm/direct-sales/analytics', label: 'Direct Sales Analytics', icon: '📊', audiences: ['ds_sup'] },
      { href: '/crm/leads', label: 'Lead Management', icon: '❄️', audiences: ['ts_sup', 'ds_sup', 'admin'] },
      { href: '/crm/assign', label: 'Assign & Distribute', icon: '🎯', audiences: ['ts_sup', 'admin'] },
      { href: '/crm/credit', label: 'Credit Decisions', icon: '🏦', audiences: ['ds_sup', 'admin'] },
      { href: '/crm/attendance', label: 'Attendance', icon: '✅', audiences: ['ts_sup', 'ds_sup', 'admin'] },
      { href: '/crm/duplicates', label: 'Duplicates', icon: '🔁', audiences: ['ts_sup', 'ds_sup', 'admin'] },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/crm/projects', label: 'Project Management', icon: '🏗️', audiences: ['ts_sup', 'ds_sup', 'admin'] },
      { href: '/crm/teams', label: 'Team Management', icon: '👥', audiences: ['admin'] },
      { href: '/crm/users', label: 'User Management', icon: '🧑‍💼', audiences: ['admin'] },
      { href: '/crm/statuses', label: 'Lead Statuses', icon: '🏷️', audiences: ['admin'] },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/crm/whatsapp', label: 'WhatsApp', icon: '💬', audiences: ['agent', 'ts_sup', 'ds_sup', 'admin'] },
      { href: '/crm/profile', label: 'Profile', icon: '⚙️', audiences: ['agent', 'ts_sup', 'ds_sup', 'admin'] },
    ],
  },
]

function audienceOf(role: string): Audience {
  if (role === 'admin') return 'admin'
  if (role === 'telesales_supervisor') return 'ts_sup'
  if (role === 'direct_sales_supervisor') return 'ds_sup'
  return 'agent'
}

export default function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, ready, isAuthed, isManager, logout } = useSession()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isLoginRoute = pathname === '/crm/login'

  // Auth gate
  useEffect(() => {
    if (ready && !isAuthed && !isLoginRoute) router.replace('/crm/login')
  }, [ready, isAuthed, isLoginRoute, router])

  // Close the mobile drawer on navigation
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  // Login screen renders full-bleed, without the shell chrome
  if (isLoginRoute) return <>{children}</>

  if (!ready || !isAuthed) {
    return <div className="h-screen bg-[#f7f8fa] flex items-center justify-center text-[#6B7280] text-sm">Loading…</div>
  }

  const aud = audienceOf(user.role)
  const sections = NAV_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => i.audiences.includes(aud)) }))
    .filter((s) => s.items.length > 0)
  const isAgent = aud === 'agent'

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between gap-2.5 px-4 h-16 border-b border-[#e5e7eb] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo variant="full" height={26} />
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#5757e6]/15 text-[#5757e6] flex-shrink-0">
            {isManager ? (aud === 'admin' ? 'ADMIN' : 'SUP') : 'SALES'}
          </span>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
          className="lg:hidden text-[#6B7280] hover:text-[#111827] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] flex-shrink-0"
        >
          ✕
        </button>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.label && (
              <p className="px-5 mb-1 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{section.label}</p>
            )}
            <div className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active ? 'bg-[#5757e6]/15 text-[#5757e6] font-medium' : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#f3f4f6]'
                    }`}>
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-[#e5e7eb] flex-shrink-0">
        <p className="text-[10px] text-[#4B5563] leading-relaxed">Frontend demo · data in your browser.</p>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-[#f7f8fa] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-white border-r border-[#e5e7eb]">
        {sidebarContent}
      </aside>

      {/* Mobile off-canvas sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-white flex flex-col shadow-2xl animate-[slideIn_0.2s_ease-out]">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-[#e5e7eb] bg-white flex-shrink-0 gap-3 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="lg:hidden text-[#4B5563] hover:text-[#111827] w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] flex-shrink-0"
            >
              ☰
            </button>
            <div className="text-sm text-[#6B7280] min-w-0 truncate hidden sm:block">
              Drive Finance CRM · <span className="text-[#111827] capitalize">{user.role.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {isAgent && <AttendanceControls userId={user.id} />}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#5757e6]/20 flex items-center justify-center text-[#5757e6] text-xs font-bold flex-shrink-0">
                {user.full_name.charAt(0)}
              </div>
              <span className="text-sm text-[#111827] hidden md:inline">{user.full_name}</span>
            </div>
            <button onClick={() => { logout(); router.replace('/crm/login') }}
              className="text-xs text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors flex-shrink-0">
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  )
}
