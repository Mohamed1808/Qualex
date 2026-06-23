'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Profile, DailyAttendance } from '@/types/database'
import BreakButton from '@/components/shared/BreakButton'
import NotificationBell from '@/components/shared/NotificationBell'
import BrandLogo from '@/components/shared/BrandLogo'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { useAttendance } from '@/hooks/useAttendance'
import { createClient } from '@/lib/supabase/client'

const CAIRO_TZ = 'Africa/Cairo'

interface DirectSalesShellProps {
  profile: Profile
  initialAttendance: DailyAttendance | null
  children: React.ReactNode
}

const navItems = [
  { href: '/direct-sales/agent', label: 'My Queue', icon: '📋', roles: ['direct_sales_agent'] },
  {
    href: '/direct-sales/supervisor',
    label: 'Live Queue',
    icon: '👁️',
    roles: ['direct_sales_supervisor'],
  },
  {
    href: '/direct-sales/supervisor/analytics',
    label: 'Analytics',
    icon: '📊',
    roles: ['direct_sales_supervisor'],
  },
  {
    href: '/direct-sales/supervisor/attendance',
    label: 'Attendance',
    icon: '✅',
    roles: ['direct_sales_supervisor'],
  },
  {
    href: '/direct-sales/supervisor/unqualified',
    label: 'Unqualified Review',
    icon: '🔍',
    roles: ['direct_sales_supervisor'],
  },
  {
    href: '/direct-sales/supervisor/duplicates',
    label: 'Duplicates',
    icon: '🔁',
    roles: ['direct_sales_supervisor'],
  },
]

export default function DirectSalesShell({
  profile,
  initialAttendance,
  children,
}: DirectSalesShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [cairoTime, setCairoTime] = useState('')
  const supabase = createClient()

  const { attendance } = useAttendance(profile.id)
  const currentAttendance = attendance ?? initialAttendance

  useEffect(() => {
    function tick() {
      setCairoTime(format(toZonedTime(new Date(), CAIRO_TZ), 'EEE, MMM d · h:mm:ss a'))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const visibleNav = navItems.filter((item) => item.roles.includes(profile.role))
  const isOnBreak = currentAttendance?.on_break
  const isCheckedOut = currentAttendance?.checked_out
  const accentColor = '#14B8A6'

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`flex-shrink-0 flex flex-col bg-[#161616] border-r border-[#2a2a2a] transition-all duration-200 ${
          expanded ? 'w-56' : 'w-14'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-[#2a2a2a] h-14 overflow-hidden">
          {expanded ? (
            <>
              <BrandLogo variant="full" height={26} />
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{ color: accentColor, backgroundColor: `${accentColor}1a` }}
              >
                DS
              </span>
            </>
          ) : (
            <BrandLogo variant="mark" height={28} className="flex-shrink-0" />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-hidden">
          {visibleNav.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors mx-1.5 rounded-lg ${
                  isActive
                    ? 'bg-[#14B8A6]/15 text-[#14B8A6]'
                    : 'text-[#6B7280] hover:text-white hover:bg-[#1c1c22]'
                }`}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {expanded && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#2a2a2a] p-2">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-2 py-2 w-full text-[#6B7280] hover:text-white hover:bg-[#1c1c22] rounded-lg transition-colors overflow-hidden"
          >
            <span className="text-base flex-shrink-0">🚪</span>
            {expanded && <span className="text-xs whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isOnBreak && (
          <div className="bg-[#F59E0B] text-black text-xs font-semibold text-center py-1.5 flex-shrink-0 flex items-center justify-center gap-2">
            <span>☕</span>
            <span>You are currently on break.</span>
          </div>
        )}
        {isCheckedOut && !isOnBreak && (
          <div className="bg-[#F26161] text-white text-xs font-semibold text-center py-1.5 flex-shrink-0 flex items-center justify-center gap-2">
            <span>🔴</span>
            <span>You have checked out for today.</span>
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between px-6 h-14 border-b border-[#2a2a2a] bg-[#161616] flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}25` }}
            >
              <span className="text-xs font-bold" style={{ color: accentColor }}>
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
              <p className="text-[10px] text-[#6B7280] capitalize">
                {profile.role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280] font-mono hidden md:block">{cairoTime}</span>
            <BreakButton attendance={currentAttendance} agentId={profile.id} onUpdate={() => {}} />
            <NotificationBell userId={profile.id} />
          </div>
        </header>

        <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  )
}
