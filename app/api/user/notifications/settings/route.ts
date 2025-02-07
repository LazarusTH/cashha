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
    const { emailNotifications, pushNotifications, types } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Update notification settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        notification_types: types
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'notification_settings',
      description: 'Updated notification preferences'
    })

    return NextResponse.json({
      message: 'Notification settings updated',
      settings
    })
  } catch (error: any) {
    console.error('Notification settings update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update notification settings' 
    }), { status: 500 })
  }
})
