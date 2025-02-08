import { NextResponse } from 'next/server'
import { authenticatedRoute } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'
import { generateTOTP } from '@/lib/auth/totp'

export const POST = authenticatedRoute(async (req, { user }) => {
  try {
    // Generate TOTP secret and QR code
    const { secret, qrCode } = await generateTOTP(user.email)

    // Store the secret temporarily (it will be confirmed after user verifies)
    await supabase
      .from('profiles')
      .update({
        two_factor_secret: secret,
        two_factor_enabled: false
      })
      .eq('id', user.id)

    // Log the security update attempt
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        type: '2fa_setup_initiated',
        details: { timestamp: new Date().toISOString() },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      })

    return NextResponse.json({ secret, qrCode })
  } catch (error) {
    console.error('Error enabling 2FA:', error)
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    )
  }
})
