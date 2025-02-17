export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logAdminAction } from '@/lib/utils/audit-logger'

export async function GET(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get recent security events
    const { data: securityEvents, error: eventsError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .in('action', ['LOGIN_ATTEMPT', 'PASSWORD_CHANGE', 'SECURITY_UPDATE'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (eventsError) throw eventsError

    // Get user's security settings
    const { data: settings, error } = await supabase
      .from('user_account_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    const securitySettings = settings || {
      email_notifications: true,
      sms_notifications: false,
      login_alerts: true,
      transaction_alerts: true,
    };

    return NextResponse.json({
      events: securityEvents,
      settings: securitySettings,
    })
  } catch (error: any) {
    console.error('Security settings fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch security settings' 
    }), { status: 500 })
  }
}

export async function PUT(req: Request) {
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

    // Update security settings
    const { error: settingsError } = await supabase
      .from('user_account_settings')
      .upsert({
        user_id: user.id,
        ...updates,
        last_security_review: new Date().toISOString()
      })

    if (settingsError) throw settingsError

    // Log action
    await logAdminAction(user.id, 'SECURITY_UPDATE', {
      updates,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Security settings updated'
    })
  } catch (error: any) {
    console.error('Security settings update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update security settings' 
    }), { status: 500 })
  }
}
