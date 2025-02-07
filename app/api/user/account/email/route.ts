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
    const { newEmail, password } = await req.json()

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

    // Check if email already exists
    const { data: existingUser, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', newEmail)
      .single()

    if (existingUser) {
      return new NextResponse(JSON.stringify({ 
        error: 'Email already in use' 
      }), { status: 400 })
    }

    // Update email
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (error) throw error

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', user.id)

    if (profileError) throw profileError

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'email_changed',
      description: `Email changed to ${newEmail}`
    })

    return NextResponse.json({
      message: 'Email update request sent. Please check your new email for verification.'
    })
  } catch (error: any) {
    console.error('Email update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update email' 
    }), { status: 500 })
  }
})
