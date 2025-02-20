export const dynamic = 'force-dynamic';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AuthError } from './auth'

const ADMIN_ROLE_CACHE = new Map<string, { role: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export class AdminAuthError extends AuthError {
  constructor(message: string, code: string, status: number) {
    super(message, code, status);
    this.name = 'AdminAuthError';
  }
}

export class UnauthorizedError extends AdminAuthError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AdminAuthError {
  constructor(message = 'Forbidden - Admin access required') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export async function adminAuthGuard() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      throw new UnauthorizedError()
    }

    // Check cache first
    const cachedRole = ADMIN_ROLE_CACHE.get(session.user.id)
    if (cachedRole && Date.now() - cachedRole.timestamp < CACHE_TTL) {
      return cachedRole.role === 'admin'
    }

    // If not in cache or expired, fetch from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      throw new UnauthorizedError('Failed to verify admin status')
    }

    // Update cache
    ADMIN_ROLE_CACHE.set(session.user.id, {
      role: profile?.role || 'user',
      timestamp: Date.now()
    })

    return profile?.role === 'admin'
  } catch (error) {
    console.error('Admin auth guard error:', error)
    return false
  }
}

export function withAdminAuth(handler: Function) {
  return async (req: Request) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new UnauthorizedError()
      }

      // Check cache first
      const cachedRole = ADMIN_ROLE_CACHE.get(session.user.id)
      if (cachedRole && Date.now() - cachedRole.timestamp < CACHE_TTL) {
        if (cachedRole.role !== 'admin') {
          throw new ForbiddenError()
        }
      } else {
        // If not in cache or expired, fetch from database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile) {
          throw new UnauthorizedError('Failed to verify admin status')
        }

        // Update cache
        ADMIN_ROLE_CACHE.set(session.user.id, {
          role: profile.role,
          timestamp: Date.now()
        })

        if (profile.role !== 'admin') {
          throw new ForbiddenError()
        }
      }

      // Add admin context to request
      const enhancedReq = new Request(req, {
        headers: new Headers({
          ...Object.fromEntries(req.headers),
          'x-admin-id': session.user.id,
          'x-admin-email': session.user.email || ''
        })
      })

      return handler(enhancedReq)
    } catch (error) {
      console.error('Admin auth error:', error)
      if (error instanceof AdminAuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        )
      }
      if (error instanceof Error) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}