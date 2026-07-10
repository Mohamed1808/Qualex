'use client'

// ============================================================================
// CRM v2 — session/persona (frontend-only)
// There is no auth yet. This picks the "signed-in" user from localStorage so
// the UI can show the right portal (Admin vs Sales Agent). The backend team
// replaces this with the real authenticated session.
// ============================================================================

import { useEffect, useState } from 'react'
import type { CrmUser, UserRole } from './types'
import { SEED_USERS } from './mock-data'

const KEY = 'qualex-crm-current-user'

export function isManager(role: UserRole): boolean {
  return role === 'admin' || role === 'telesales_supervisor' || role === 'direct_sales_supervisor'
}

export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return 'u-admin'
  return window.localStorage.getItem(KEY) || 'u-admin'
}

export function setCurrentUserId(id: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, id)
  window.dispatchEvent(new Event('crm-session-change'))
}

/** React hook: current persona + the list of switchable demo personas. */
export function useSession() {
  const [id, setId] = useState<string>('u-admin')

  useEffect(() => {
    setId(getCurrentUserId())
    const onChange = () => setId(getCurrentUserId())
    window.addEventListener('crm-session-change', onChange)
    return () => window.removeEventListener('crm-session-change', onChange)
  }, [])

  const users: CrmUser[] = SEED_USERS
  const user = users.find((u) => u.id === id) ?? users[0]
  return {
    user,
    users,
    isManager: isManager(user.role),
    switchTo: (uid: string) => setCurrentUserId(uid),
  }
}
