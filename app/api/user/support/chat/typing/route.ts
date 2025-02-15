import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { isTyping } = await req.json()

    // Get user's active ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, agent_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (ticketError && ticketError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw ticketError
    }

    if (!ticket) {
      return NextResponse.json({ success: false, message: 'No active support ticket' })
    }

    // Update typing status
    const { error: typingError } = await supabase
      .from('support_typing_indicators')
      .upsert({
        ticket_id: ticket.id,
        user_id: user.id,
        is_typing: isTyping,
        last_updated: new Date().toISOString()
      })

    if (typingError) throw typingError

    // Broadcast typing status through Supabase realtime
    await supabase
      .from('support_typing_broadcasts')
      .insert({
        ticket_id: ticket.id,
        user_id: user.id,
        agent_id: ticket.agent_id,
        is_typing: isTyping
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Typing indicator error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update typing status' 
    }), { status: 500 })
  }
})
