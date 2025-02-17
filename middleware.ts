import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/signin', '/signup', '/forgot-password', '/reset-password', '/verify-email']
const ADMIN_ROUTES = ['/admin']
const USER_ROUTES = ['/dashboard', '/profile', '/settings']

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res: response })
    const pathname = request.nextUrl.pathname

    // Skip middleware for public routes
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
      return response
    }

    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.redirect(new URL('/signin', request.url))
    }

    // No session, redirect to login
    if (!session) {
      const redirectUrl = new URL('/signin', request.url)
      redirectUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Get user profile and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email_verified')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return NextResponse.redirect(new URL('/signin', request.url))
    }

    // Check email verification
    if (!profile.email_verified && !pathname.startsWith('/verify-email')) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // Check admin routes
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Check user routes
    if (USER_ROUTES.some(route => pathname.startsWith(route))) {
      if (profile.role !== 'user' && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/signin', request.url))
      }
    }

    // Update session in response
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/signin', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
