'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import BrandLogo from '@/components/shared/BrandLogo'
import { useSession } from '@/lib/crm/session'
import AttendanceControls from './AttendanceControls'

type Audience = 'agent' | 'ts_sup' | 'ds_sup' | 'admin'

// which roles see each item
const NAV: { href: string; label: string; icon: string; audiences: Audience[] }[] = [
  { href: '/crm/sales', label: 'My Queue', icon: '🏠', audiences: ['agent'] },
  // Telesales supervisor
  { href: '/crm/telesales/queue', label: 'Telesales Queue', icon: '📞', audiences: ['ts_sup'] },
  { href: '/crm/telesales/analytics', label: 'Analytics', icon: '📊', audiences: ['ts_sup'] },
  // Direct sales supervisor
  { href: '/crm/direct-sales/queue', label: 'Direct Sales Queue', icon: '🤝', audiences: ['ds_sup'] },
  { href: '/crm/direct-sales/analytics', label: 'Analytics', icon: '📊', audiences: ['ds_sup'] },
  // Shared supervisor tools
  { href: '/crm/attendance', label: 'Attendance', icon: '✅', audiences: ['ts_sup', 'ds_sup', 'admin'] },
  { href: '/crm/duplicates', label: 'Duplicates', icon: '🔁', audiences: ['ts_sup', 'ds_sup', 'admin'] },
  { href: '/crm/leads', label: 'Lead Management', icon: '❄️', audiences: ['ts_sup', 'ds_sup', 'admin'] },
  { href: '/crm/assign', label: 'Assign & Distribute', icon: '🎯', audiences: ['ts_sup', 'admin'] },
  { href: '/crm/credit', label: 'Credit Decisions', icon: '🏦', audiences: ['ds_sup', 'admin'] },
  { href: '/crm/projects', label: 'Project Management', icon: '🏗️', audiences: ['ts_sup', 'ds_sup', 'admin'] },
  { href: '/crm/teams', label: 'Team Management', icon: '👥', audiences: ['admin'] },
  { href: '/crm/users', label: 'User Management', icon: '🧑‍💼', audiences: ['admin'] },
  { href: '/crm/statuses', label: 'Lead Statuses', icon: '🏷️', audiences: ['admin'] },
  { href: '/crm/whatsapp', label: 'WhatsApp', icon: '💬', audiences: ['agent', 'ts_sup', 'ds_sup', 'admin'] },
  { href: '/crm/profile', label: 'Profile', icon: '⚙️', audiences: ['agent', 'ts_sup', 'ds_sup', 'admin'] },
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

  const isLoginRoute = pathname === '/crm/login'

  // Auth gate
  useEffect(() => {
    if (ready && !isAuthed && !isLoginRoute) router.replace('/crm/login')
  }, [ready, isAuthed, isLoginRoute, router])

  // Login screen renders full-bleed, without the shell chrome
  if (isLoginRoute) return <>{children}</>

  if (!ready || !isAuthed) {
    return <div className="h-screen bg-[#f7f8fa] flex items-center justify-center text-[#6B7280] text-sm">Loading…</div>
  }

  const aud = audienceOf(user.role)
  const nav = NAV.filter((n) => n.audiences.includes(aud))
  const isAgent = aud === 'agent'

  return (
    <div className="flex h-screen bg-[#f7f8fa] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#ffffff] border-r border-[#e5e7eb]">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-[#e5e7eb]">
          <BrandLogo variant="full" height={26} />
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#5757e6]/15 text-[#5757e6]">
            {isManager ? (aud === 'admin' ? 'ADMIN' : 'SUP') : 'SALES'}
          </span>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-[#5757e6]/15 text-[#5757e6] font-medium' : 'text-[#4B5563] hover:text-white hover:bg-[#f3f4f6]'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t border-[#e5e7eb]">
          <p className="text-[10px] text-[#4B5563] leading-relaxed">Frontend demo · data in your browser.</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-6 h-16 border-b border-[#e5e7eb] bg-[#ffffff] flex-shrink-0 gap-4">
          <div className="text-sm text-[#6B7280] min-w-0 truncate">
            Drive Finance CRM · <span className="text-[#111827] capitalize">{user.role.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-4">
            {isAgent && <AttendanceControls userId={user.id} />}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#5757e6]/20 flex items-center justify-center text-[#5757e6] text-xs font-bold">
                {user.full_name.charAt(0)}
              </div>
              <span className="text-sm text-[#111827] hidden md:inline">{user.full_name}</span>
            </div>
            <button onClick={() => { logout(); router.replace('/crm/login') }}
              className="text-xs text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg px-3 py-1.5 transition-colors">
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  )
}
