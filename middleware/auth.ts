import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface SecurityContext {
  ip: string
  userAgent: string
  timestamp: number
}

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

export const withAuth = (handler: Function) => async (req: Request, ...args: any[]) => {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      throw new AuthError('Authentication failed', 'UNAUTHORIZED', 401);
    }

    if (!session) {
      throw new AuthError('Unauthorized - No session found', 'UNAUTHORIZED', 401);
    }

    // Check session expiration
    const now = Date.now()
    const sessionExpiry = new Date(session.expires_at! * 1000).getTime()
    if (now >= sessionExpiry) {
      throw new AuthError('Session expired', 'UNAUTHORIZED', 401);
    }

    // Create security context
    const securityContext: SecurityContext = {
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      timestamp: now
    }

    // Store security context in request for logging/auditing
    const enhancedReq = new Request(req, {
      headers: new Headers({
        ...Object.fromEntries(req.headers),
        'x-security-context': JSON.stringify(securityContext)
      })
    })

    // If session is close to expiry, refresh it
    if (sessionExpiry - now < 300000) { // 5 minutes
      const { data: { session: newSession }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.error('Session refresh error:', refreshError)
      }
    }

    // Add user info to request
    const enhancedReqWithUser = new Request(enhancedReq, {
      headers: new Headers({
        ...Object.fromEntries(enhancedReq.headers),
        'x-user-id': session.user.id,
        'x-user-role': session.user.role || 'user'
      })
    })

    return handler(enhancedReqWithUser, ...args)
  } catch (error) {
    console.error('Auth middleware error:', error)
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}