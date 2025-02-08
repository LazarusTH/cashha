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
      .select('two_factor_secret')
      .eq('id', user.id)
      .single()

    if (!profile?.two_factor_secret) {
      return NextResponse.json(
        { error: '2FA not set up' },
        { status: 400 }
      )
    }

    // Verify the token
    const isValid = await verifyTOTP(token, profile.two_factor_secret)

    if (!isValid) {
      // Log failed verification attempt
      await supabase
        .from('security_logs')
        .insert({
          user_id: user.id,
          type: '2fa_verification_failed',
          details: { timestamp: new Date().toISOString() },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        })

      return NextResponse.json(
        { error: 'Invalid 2FA token' },
        { status: 400 }
      )
    }

    // Enable 2FA for the user
    await supabase
      .from('profiles')
      .update({
        two_factor_enabled: true
      })
      .eq('id', user.id)

    // Log successful verification
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        type: '2fa_enabled',
        details: { timestamp: new Date().toISOString() },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying 2FA:', error)
    return NextResponse.json(
      { error: 'Failed to verify 2FA token' },
      { status: 500 }
    )
  }
})
