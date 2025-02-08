import { NextResponse } from 'next/server'
import { authenticatedRoute } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'
import { verifyTOTP } from '@/lib/auth/totp'

export const POST = authenticatedRoute(async (req, { user }) => {
  try {
    const { token } = await req.json()

    // Get user's TOTP secret
    const { data: profile } = await supabase
      .from('profiles')
      .select('two_factor_secret, two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (!profile?.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    // Verify the token one last time before disabling
    const isValid = await verifyTOTP(token, profile.two_factor_secret)

    if (!isValid) {
      // Log failed verification attempt
      await supabase
        .from('security_logs')
        .insert({
          user_id: user.id,
          type: '2fa_disable_attempt_failed',
          details: { timestamp: new Date().toISOString() },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        })

      return NextResponse.json(
        { error: 'Invalid 2FA token' },
        { status: 400 }
      )
    }

    // Disable 2FA
    await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null
      })
      .eq('id', user.id)

    // Log 2FA disable
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        type: '2fa_disabled',
        details: { timestamp: new Date().toISOString() },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      })

    // Send security alert email
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        template: 'security_alert',
        data: {
          type: '2FA Disabled',
          timestamp: new Date().toLocaleString(),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
})
