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
    const { currentPassword, newPassword } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return new NextResponse(JSON.stringify({ 
        error: 'Current password is incorrect' 
      }), { status: 400 })
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'password_changed',
      description: 'Password was changed'
    })

    return NextResponse.json({
      message: 'Password updated successfully'
    })
  } catch (error: any) {
    console.error('Password update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update password' 
    }), { status: 500 })
  }
})
