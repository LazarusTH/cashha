import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create a new ratelimiter that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  try {
    // Rate limiting for auth endpoints
    if (request.nextUrl.pathname.startsWith('/api/auth')) {
      const ip = request.ip ?? '127.0.0.1'
      const { success, pending, limit, reset, remaining } = await ratelimit.limit(
        `ratelimit_${ip}`
      )

      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        })
      }
    }

    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session if expired
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Protected routes
    const protectedRoutes = ['/dashboard', '/settings', '/transactions']
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isProtectedRoute && !session) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }

    // Auth routes (when already logged in)
    const authRoutes = ['/signin', '/signup']
    const isAuthRoute = authRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // List of sensitive routes that need rate limiting
    const sensitiveRoutes = [
      "/api/auth/login",
      "/api/auth/signup",
      "/api/auth/recover",
      "/api/profile",
    ];

    // Check if this is a sensitive route
    if (sensitiveRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
      // Get IP for rate limiting
      const ip = request.ip ?? "127.0.0.1";
      const { success, limit, reset, remaining } = await ratelimit.limit(
        `${request.nextUrl.pathname}_${ip}`
      );

      // Set rate limit headers
      res.headers.set("X-RateLimit-Limit", limit.toString());
      res.headers.set("X-RateLimit-Remaining", remaining.toString());
      res.headers.set("X-RateLimit-Reset", reset.toString());

      if (!success) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 }
        );
      }
    }

    // Get the pathname
    const path = request.nextUrl.pathname

    // Paths that are always accessible
    const publicPaths = ['/', '/signin', '/signup']
    if (publicPaths.includes(path)) {
      return res
    }

    // Check if user is authenticated
    if (!session) {
      return NextResponse.redirect(new URL('/signin', request.url))
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
      return NextResponse.redirect(new URL('/user/dashboard', request.url))
    }

    // User route protection
    if (path.startsWith('/user') && role !== 'user') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    return res
  } catch (e) {
    console.error('Middleware error:', e)
    return NextResponse.next()
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
