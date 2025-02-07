import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return new NextResponse(JSON.stringify({ 
        error: 'Verification token is required' 
      }), { status: 400 })
    }

    // Verify the user's email
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })

    if (error) throw error

    // Update user profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError
    }

    return NextResponse.redirect(new URL('/signin', req.url))
  } catch (error: any) {
    console.error('Email verification error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Email verification failed' 
    }), { status: 500 })
  }
})
