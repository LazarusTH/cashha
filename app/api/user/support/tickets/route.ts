import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get pagination params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        messages:support_messages(
          id,
          content,
          type,
          created_at,
          user:profiles!user_id (
            id,
            email,
            full_name
          ),
          agent:profiles!agent_id (
            id,
            email,
            full_name
          )
        )
      `, { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: tickets, error: ticketsError, count } = await query

    if (ticketsError) {
      console.error('Tickets fetch error:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Tickets fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { title, description, priority = 'low' } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: session.user.id,
        title,
        status: 'open',
        priority
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    // Create initial message
    const { error: messageError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        user_id: session.user.id,
        content: description,
        type: 'user',
        status: 'sent'
      })

    if (messageError) {
      console.error('Message creation error:', messageError)
      // Don't return error since ticket was created
    }

    // Notify support team
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'new_ticket',
        title: 'New Support Ticket',
        content: `New ticket: ${title}`,
        metadata: {
          ticket_id: ticket.id,
          priority,
          user_id: session.user.id
        },
        role: 'support'
      })

    if (notificationError) {
      console.error('Notification creation error:', notificationError)
    }

    return NextResponse.json(ticket)

  } catch (error) {
    console.error('Ticket creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { ticket_id, status } = await request.json()

    if (!ticket_id) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      )
    }

    if (!['open', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Verify ticket ownership
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('id', ticket_id)
      .eq('user_id', session.user.id)
      .single()

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Update ticket status
    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', ticket_id)
      .select()
      .single()

    if (updateError) {
      console.error('Ticket update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedTicket)

  } catch (error) {
    console.error('Ticket update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
