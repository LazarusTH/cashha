import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const unreadOnly = searchParams.get('unread') === 'true'

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    // Get paginated results
    const { data: notifications, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      notifications,
      total: count || 0,
      page,
      limit,
      unreadCount: notifications?.filter(n => !n.read).length || 0
    })
  } catch (error: any) {
    console.error('Notifications fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch notifications' 
    }), { status: 500 })
  }
}
