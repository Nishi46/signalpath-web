import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            res.cookies.set(name, value, {
              ...options,
              maxAge: 60 * 60 * 24 * 30, // 30 days
            })
          }
        },
      },
    },
  )

  const { data: { session } } = await supabase.auth.getSession()

  const publicPaths = ['/signin', '/signup', '/about', '/privacy']
  const isPublic = publicPaths.some(p => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(p + '/'))
  const isRoot = req.nextUrl.pathname === '/'

  if (isPublic || isRoot) {
    return res
  }

  if (!session) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
