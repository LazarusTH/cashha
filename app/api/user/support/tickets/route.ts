import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get support tickets
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!user_id(full_name, email),
        agent:profiles!agent_id(full_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ tickets })
  } catch (error: any) {
    console.error('Support tickets fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch support tickets' 
    }), { status: 500 })
  }
})

export const POST = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { subject, description, priority } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Create ticket
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        description,
        priority,
        status: 'open'
      })
      .select(`
        *,
        user:profiles!user_id(full_name, email)
      `)
      .single()

    if (error) throw error

    // Create initial message
    const { error: messageError } = await supabase
      .from('support_messages')
      .insert({
        user_id: user.id,
        ticket_id: ticket.id,
        content: description,
        type: 'user'
      })

    if (messageError) throw messageError

    // Create notification for support team
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'support_ticket',
        title: 'New Support Ticket',
        content: `New ticket from ${user.email}: ${subject}`,
        role: 'support'
      })

    if (notificationError) throw notificationError

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error('Support ticket creation error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to create support ticket' 
    }), { status: 500 })
  }
})
