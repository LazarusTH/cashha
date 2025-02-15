import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const PUT = withUser(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (notificationError || !notification) {
      return new NextResponse(JSON.stringify({ 
        error: 'Notification not found' 
      }), { status: 404 })
    }

    // Mark as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Notification marked as read'
    })
  } catch (error: any) {
    console.error('Notification update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to mark notification as read' 
    }), { status: 500 })
  }
})
