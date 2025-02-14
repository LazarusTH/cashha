import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Ensure Supabase environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

// Initialize rate limiters only if Redis is configured
let rateLimits: {
  auth?: Ratelimit;
  api?: Ratelimit;
  general?: Ratelimit;
} = {}

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = Redis.fromEnv()
  rateLimits = {
    auth: new Ratelimit({
      redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
      prefix: 'ratelimit_auth',
    }),
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      analytics: true,
      prefix: 'ratelimit_api',
    }),
    general: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '60 s'),
      analytics: true,
      prefix: 'ratelimit_general',
    })
  }
}

export async function middleware(request: NextRequest) {
  try {
    // Get client IP with fallbacks
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               request.ip ||
               '127.0.0.1'

    // Only apply rate limiting if Redis is configured
    if (Object.keys(rateLimits).length > 0) {
      // Apply different rate limits based on the route
      if (request.nextUrl.pathname.startsWith('/api/auth') && rateLimits.auth) {
        const { success, limit, reset, remaining } = await rateLimits.auth.limit(
          `auth_${ip}`
        )

        if (!success) {
          return new NextResponse('Too Many Auth Requests', {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          })
        }
      } else if (request.nextUrl.pathname.startsWith('/api/') && rateLimits.api) {
        const { success, limit, reset, remaining } = await rateLimits.api.limit(
          `api_${ip}`
      )

      if (!success) {
          return new NextResponse('Too Many API Requests', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          })
        }
      } else if (rateLimits.general) {
        const { success } = await rateLimits.general.limit(
          `general_${ip}`
        )

        if (!success) {
          return new NextResponse('Too Many Requests', { status: 429 })
        }
      }
    }

    // Create a response with the appropriate headers
    const response = NextResponse.next()

    // Create a Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Refresh session if expired
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Session error:', sessionError)
      return response
    }

    // Protected routes
    const protectedRoutes = ['/dashboard', '/settings', '/transactions', '/admin']
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/signin', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Admin routes protection
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session?.user?.id)
        .single()

      if (profileError || !profile || profile.role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 403 })
      }
    }

    // Auth routes (when already logged in)
    const authRoutes = ['/signin', '/signup', '/forgot-password']
    const isAuthRoute = authRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
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
