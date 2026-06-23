'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface AdminShellProps {
  profile: Profile
  children: React.ReactNode
}

const navItems = [
  { href: '/admin', label: 'Lead Intake', icon: '➕' },
  { href: '/admin/credit', label: 'Credit Decisions', icon: '🏦' },
  { href: '/admin/audit', label: 'Audit Log', icon: '📜' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/config', label: 'Config', icon: '⚙️' },
]

export default function AdminShell({ profile, children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#161616] border-r border-[#2a2a2a]">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#2a2a2a] h-14">
          <div className="w-7 h-7 bg-[#7C3AED] rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="text-white font-semibold text-sm">Admin Panel</span>
        </div>

        <nav className="flex-1 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                    : 'text-[#6B7280] hover:text-white hover:bg-[#1c1c22]'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#2a2a2a] p-3">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
              <span className="text-[#7C3AED] text-xs font-bold">
                {profile.full_name.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-[#9CA3AF] truncate">{profile.full_name}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-2 py-1.5 w-full text-[#6B7280] hover:text-white text-xs transition-colors rounded-lg hover:bg-[#1c1c22]"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
    </div>
  )
}
