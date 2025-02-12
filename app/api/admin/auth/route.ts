import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { username, password } = await req.json()

    // First try email/password sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password
    })

    if (signInError) throw signInError

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', signInData.user.id)
      .single()

    if (profileError) throw profileError

    if (profile.role !== 'admin') {
      // Sign out non-admin user
      await supabase.auth.signOut()
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized access' 
      }), { status: 403 })
    }

    if (!profile.is_active) {
      // Sign out inactive admin
      await supabase.auth.signOut()
      return new NextResponse(JSON.stringify({ 
        error: 'Account is inactive' 
      }), { status: 403 })
    }

    // Create admin session
    const { data: session, error: sessionError } = await supabase.auth.refreshSession()
    if (sessionError) throw sessionError

    // Log admin activity
    const { error: activityError } = await supabase
      .from('admin_activities')
      .insert({
        admin_id: signInData.user.id,
        action: 'admin_login',
        metadata: {
          ip: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        }
      })

    if (activityError) throw activityError

    return NextResponse.json({ 
      session: session,
      user: {
        id: signInData.user.id,
        email: signInData.user.email,
        role: profile.role
      }
    })
  } catch (error: any) {
    console.error('Admin auth error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Authentication failed' 
    }), { status: 401 })
  }
}
