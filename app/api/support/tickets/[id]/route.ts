import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'
import { withAdmin } from '@/middleware/admin'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { status, adminNote } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    // Update ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .update({
        status,
        admin_note: adminNote,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (ticketError) throw ticketError

    // Add status change message
    const { error: messageError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: params.id,
        sender_id: user.id,
        sender_type: 'system',
        content: `Ticket status changed to ${status}`,
        read: false
      })

    if (messageError) throw messageError

    // If ticket is closed, send a notification
    if (status === 'closed') {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: ticket.user_id,
          type: 'support',
          title: 'Support Ticket Closed',
          content: `Your support ticket "${ticket.subject}" has been closed.`,
          read: false
        })

      if (notificationError) throw notificationError
    }

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error('Support ticket update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update ticket' 
    }), { status: 500 })
  }
}
