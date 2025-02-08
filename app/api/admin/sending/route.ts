import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    let query = supabase
      .from('send_requests')
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          full_name,
          email
        ),
        recipient:profiles!recipient_id (
          id,
          full_name,
          email
        ),
        transaction:transactions (
          id,
          status,
          amount,
          created_at
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Get paginated results
    const { data: requests, error: requestsError, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (requestsError) {
      console.error('Send requests fetch error:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch send requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      requests,
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Send requests fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id, action, reason } = await request.json()

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      )
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Get send request
    const { data: sendRequest, error: requestError } = await supabase
      .from('send_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (requestError) {
      console.error('Send request fetch error:', requestError)
      return NextResponse.json(
        { error: 'Failed to fetch send request' },
        { status: 500 }
      )
    }

    if (sendRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only process pending requests' },
        { status: 400 }
      )
    }

    // Start transaction
    if (action === 'approve') {
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          sender_id: sendRequest.sender_id,
          recipient_id: sendRequest.recipient_id,
          amount: sendRequest.amount,
          type: 'send',
          status: 'completed',
          processed_by: session.user.id
        })
        .select()
        .single()

      if (transactionError) {
        console.error('Transaction creation error:', transactionError)
        return NextResponse.json(
          { error: 'Failed to create transaction' },
          { status: 500 }
        )
      }

      // Update send request
      const { error: updateError } = await supabase
        .from('send_requests')
        .update({
          status: 'approved',
          transaction_id: transaction.id,
          processed_by: session.user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Send request update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update send request' },
          { status: 500 }
        )
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: session.user.id,
        type: 'send_request_approved',
        metadata: {
          request_id: id,
          transaction_id: transaction.id,
          amount: sendRequest.amount,
          timestamp: new Date().toISOString()
        }
      })

      return NextResponse.json({
        message: 'Send request approved successfully',
        transaction_id: transaction.id
      })

    } else {
      // Reject request
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      // Update send request
      const { error: updateError } = await supabase
        .from('send_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_by: session.user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Send request update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update send request' },
          { status: 500 }
        )
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: session.user.id,
        type: 'send_request_rejected',
        metadata: {
          request_id: id,
          reason,
          timestamp: new Date().toISOString()
        }
      })

      return NextResponse.json({
        message: 'Send request rejected successfully'
      })
    }

  } catch (error) {
    console.error('Send request processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
