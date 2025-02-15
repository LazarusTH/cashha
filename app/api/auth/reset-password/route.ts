import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimit({
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    limit: 5,
    duration: 3600 // 1 hour
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { email } = await req.json()
    const supabase = createRouteHandlerClient({ cookies })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
    })

    if (error) throw error

    return NextResponse.json({
      message: 'Password reset instructions sent to your email'
    })
  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to send reset instructions' 
    }, {
      status: 400
    })
  }
}

export async function PUT(req: Request) {
  const rateLimitResponse = await rateLimit({
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    limit: 5,
    duration: 3600 // 1 hour
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { password } = await req.json()
    const supabase = createRouteHandlerClient({ cookies })

    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) throw error

    return NextResponse.json({
      message: 'Password updated successfully'
    })
  } catch (error: any) {
    console.error('Password update error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update password' 
    }, {
      status: 400
    })
  }
}
