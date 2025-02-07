import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const PUT = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { enabled, password } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError) {
      return new NextResponse(JSON.stringify({ 
        error: 'Password is incorrect' 
      }), { status: 400 })
    }

    // Update 2FA settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        two_factor_enabled: enabled
      })
      .select()
      .single()

    if (settingsError) throw settingsError

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: '2fa_settings',
      description: `2FA ${enabled ? 'enabled' : 'disabled'}`
    })

    return NextResponse.json({
      message: `2FA has been ${enabled ? 'enabled' : 'disabled'}`,
      settings
    })
  } catch (error: any) {
    console.error('2FA settings update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update 2FA settings' 
    }), { status: 500 })
  }
})
