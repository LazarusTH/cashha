import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create a new ratelimiter that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

// List of sensitive routes that need rate limiting
const sensitiveRoutes = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/recover",
  "/api/profile",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const pathname = req.nextUrl.pathname

  // Check if this is a sensitive route
  if (sensitiveRoutes.some((route) => pathname.startsWith(route))) {
    // Get IP for rate limiting
    const ip = req.ip ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `${pathname}_${ip}`
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

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // Update last active timestamp
    await supabase
      .from("profiles")
      .update({ last_active: new Date().toISOString() })
      .eq("id", session.user.id);

    // Update device history
    const userAgent = req.headers.get("user-agent") || "";
    await supabase.from("device_history").upsert(
      {
        profile_id: session.user.id,
        device_id: userAgent, // You might want to use a more sophisticated device ID
        browser: userAgent,
        os: userAgent,
        ip_address: req.ip,
        last_active: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    );
  }

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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
