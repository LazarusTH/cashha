import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function PUT(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { messageIds } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Mark messages as read
    const { error } = await supabase
      .from('support_messages')
      .update({ read: true })
      .in('id', messageIds)
      .eq('recipient_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Messages marked as read'
    })
  } catch (error: any) {
    console.error('Mark messages read error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to mark messages as read' 
    }), { status: 500 })
  }
}
