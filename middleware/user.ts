import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function withUser(handler: Function) {
  return async (req: NextRequest) => {
    try {
      const res = NextResponse.next()
      const supabase = createMiddlewareClient({ req, res })
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401 }
        )
      }

      // Add user to request for handlers
      ;(req as any).user = session.user
      
      return handler(req)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      )
    }
  }
}
