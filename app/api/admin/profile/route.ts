export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get admin profile with activity logs
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        activity:activity_logs(
          action,
          created_at
        )
      `)
      .eq('id', user.id)
      .eq('role', 'admin')
      .single()

    if (profileError) throw profileError

    // Get last login
    const { data: lastLogin, error: loginError } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('action', 'LOGIN')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (loginError && loginError.code !== 'PGRST116') throw loginError

    return NextResponse.json({
      ...profile,
      lastLogin: lastLogin?.created_at
    })
  } catch (error: any) {
    console.error('Admin profile fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch admin profile' 
    }), { status: 500 })
  }
})

export const PUT = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const updates = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.name,
        phone: updates.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .eq('role', 'admin')
      .select()
      .single()

    if (error) throw error

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      user.id,  // target is self
      'UPDATE_ADMIN_PROFILE',
      JSON.stringify({
        updates,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error('Admin profile update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update admin profile' 
    }), { status: 500 })
  }
})
