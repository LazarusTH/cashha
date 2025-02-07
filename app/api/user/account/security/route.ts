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

    // Get user's security settings
    const { data: settings, error } = await supabase
      .from('user_account_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // Get recent security events
    const { data: securityEvents, error: eventsError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .in('action', ['LOGIN_ATTEMPT', 'PASSWORD_CHANGE', '2FA_SETUP', 'SECURITY_UPDATE'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (eventsError) throw eventsError

    return NextResponse.json({
      settings: settings || {
        require_2fa: false,
        last_security_review: null
      },
      securityEvents,
      factors: await supabase.auth.mfa.listFactors()
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

    // If enabling 2FA, start setup
    if (updates.require_2fa) {
      const { data: factorData, error: factorError } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      })

      if (factorError) throw factorError

      // Log action
      await logAdminAction(user.id, 'SECURITY_UPDATE', {
        type: '2FA_SETUP',
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        message: 'Security settings updated',
        factorData
      })
    }

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
