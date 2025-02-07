import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Get the pathname
  const path = req.nextUrl.pathname

  // Paths that are always accessible
  const publicPaths = ['/', '/signin', '/signup']
  if (publicPaths.includes(path)) {
    return res
  }

  // Check if user is authenticated
  if (!session) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = profile?.role || 'user'

  // Admin route protection
  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/user/dashboard', req.url))
  }

  // User route protection
  if (path.startsWith('/user') && role !== 'user') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
