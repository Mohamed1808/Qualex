import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ROLE_HOME: Record<string, string> = {
  telesales_agent: '/telesales/agent',
  telesales_supervisor: '/telesales/supervisor',
  direct_sales_agent: '/direct-sales/agent',
  direct_sales_supervisor: '/direct-sales/supervisor',
  admin: '/admin',
}

const ROUTE_ROLES: Record<string, string[]> = {
  '/telesales/agent': ['telesales_agent'],
  '/telesales/supervisor': ['telesales_supervisor'],
  '/direct-sales/agent': ['direct_sales_agent'],
  '/direct-sales/supervisor': ['direct_sales_supervisor'],
  '/admin': ['admin'],
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/')) {
    return response
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get user profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined

  // Redirect root to role home
  if (pathname === '/') {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? ''] ?? '/login', request.url))
  }

  // Check role-based access for portal routes
  for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!role || !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL(ROLE_HOME[role ?? ''] ?? '/login', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
