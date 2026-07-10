'use client'

// ============================================================================
// CRM — session (frontend-only mock auth)
// A real-looking login stands in for auth until the backend team wires it up.
// login() matches an email in the seed users (any password) and stores the id.
// Replace with the real authenticated session on the company server.
// ============================================================================

import { useEffect, useState } from 'react'
import type { CrmUser, UserRole } from './types'
import { SEED_USERS } from './mock-data'

const KEY = 'qualex-crm-current-user'

export function isManager(role: UserRole): boolean {
  return role === 'admin' || role === 'telesales_supervisor' || role === 'direct_sales_supervisor'
}

export function roleHome(role: UserRole): string {
  switch (role) {
    case 'telesales_supervisor': return '/crm/telesales/queue'
    case 'direct_sales_supervisor': return '/crm/direct-sales/queue'
    case 'admin': return '/crm/leads'
    default: return '/crm/sales' // agents
  }
}

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(KEY)
}

export function setCurrentUserId(id: string | null) {
  if (typeof window === 'undefined') return
  if (id) window.localStorage.setItem(KEY, id)
  else window.localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('crm-session-change'))
}

/** Mock login: match email (case-insensitive) among active seed users. Any password. */
export function login(email: string): CrmUser | null {
  const user = SEED_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.is_active)
  if (!user) return null
  setCurrentUserId(user.id)
  return user
}

export function logout() {
  setCurrentUserId(null)
}

/** React hook for the current session. `user` falls back to the first seed user
 *  for rendering convenience; use `isAuthed` for the login gate. */
export function useSession() {
  const [id, setId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setId(getCurrentUserId())
    setReady(true)
    const onChange = () => setId(getCurrentUserId())
    window.addEventListener('crm-session-change', onChange)
    return () => window.removeEventListener('crm-session-change', onChange)
  }, [])

  const users: CrmUser[] = SEED_USERS
  const user = users.find((u) => u.id === id) ?? users[0]
  return {
    user,
    users,
    ready,
    isAuthed: id != null,
    isManager: isManager(user.role),
    switchTo: (uid: string) => setCurrentUserId(uid),
    logout,
  }
}
