import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

type AuthenticatedHandler = (
  req: Request,
  context: { user: any }
) => Promise<Response>

export const authenticatedRoute = (handler: AuthenticatedHandler) => {
  return async (req: Request) => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      return handler(req, { user: session.user })
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

export async function adminAuthGuard() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return false
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    return profile?.role === 'admin'
  } catch (error) {
    console.error('Admin auth guard error:', error)
    return false
  }
} 