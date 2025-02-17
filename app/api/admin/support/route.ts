export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles(
          id,
          email,
          full_name
        ),
        messages:support_messages(
          id,
          content,
          created_at,
          user_id
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (search) {
      query = query.or(`
        title.ilike.%${search}%,
        description.ilike.%${search}%,
        user.email.ilike.%${search}%,
        user.full_name.ilike.%${search}%
      `)
    }

    // Get paginated results
    const { data: tickets, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Support tickets fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch support tickets' },
        { status: 500 }
      )
    }

    // Get support ticket stats
    const { data: stats } = await supabase
      .from('support_tickets')
      .select('status, priority')

    // Calculate stats
    const ticketStats = {
      total: stats?.length || 0,
      by_status: stats?.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      }, {}),
      by_priority: stats?.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
        return acc
      }, {})
    }

    return NextResponse.json({
      tickets,
      stats: ticketStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Support tickets fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const PUT = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { ticketId, action, message, priority } = await req.json()

    if (!ticketId || !action) {
      return NextResponse.json(
        { error: 'Ticket ID and action are required' },
        { status: 400 }
      )
    }

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      console.error('Support ticket fetch error:', ticketError)
      return NextResponse.json(
        { error: 'Failed to fetch support ticket' },
        { status: 500 }
      )
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Support ticket not found' },
        { status: 404 }
      )
    }

    const { data: { session } } = await supabase.auth.getSession()

    switch (action) {
      case 'reply':
        if (!message?.trim()) {
          return NextResponse.json(
            { error: 'Message is required' },
            { status: 400 }
          )
        }

        // Add reply
        const { error: replyError } = await supabase
          .from('support_messages')
          .insert({
            ticket_id: ticketId,
            user_id: session?.user.id,
            content: message,
            is_admin_reply: true
          })

        if (replyError) {
          console.error('Support message creation error:', replyError)
          return NextResponse.json(
            { error: 'Failed to add reply' },
            { status: 500 }
          )
        }

        break

      case 'update_status':
        const status = message // Using message field for status
        if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 400 }
          )
        }

        // Update status
        const { error: statusError } = await supabase
          .from('support_tickets')
          .update({
            status,
            updated_at: new Date().toISOString(),
            updated_by: session?.user.id
          })
          .eq('id', ticketId)

        if (statusError) {
          console.error('Support ticket status update error:', statusError)
          return NextResponse.json(
            { error: 'Failed to update status' },
            { status: 500 }
          )
        }

        break

      case 'update_priority':
        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
          return NextResponse.json(
            { error: 'Invalid priority' },
            { status: 400 }
          )
        }

        // Update priority
        const { error: priorityError } = await supabase
          .from('support_tickets')
          .update({
            priority,
            updated_at: new Date().toISOString(),
            updated_by: session?.user.id
          })
          .eq('id', ticketId)

        if (priorityError) {
          console.error('Support ticket priority update error:', priorityError)
          return NextResponse.json(
            { error: 'Failed to update priority' },
            { status: 500 }
          )
        }

        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session?.user.id,
      type: `support_ticket_${action}`,
      metadata: {
        ticket_id: ticketId,
        action,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      message: 'Support ticket updated successfully'
    })

  } catch (error: any) {
    console.error('Support ticket update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
