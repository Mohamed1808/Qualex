import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(request.cookies.set as any)({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(response.cookies.set as any)({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(request.cookies.set as any)({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(response.cookies.set as any)({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user, supabase }
}
