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
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Validate request type
    if (!type || !['deposit', 'withdrawal', 'sending'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      )
    }

    // Build query based on request type
    let query;
    if (type === 'deposit') {
      query = supabase
        .from('deposits')
        .select(`
          *,
          user:profiles (
            id,
            full_name,
            email
          )
        `, { count: 'exact' })
    } else if (type === 'withdrawal') {
      query = supabase
        .from('withdrawals')
        .select(`
          *,
          user:profiles (
            id,
            full_name,
            email
          ),
          bank:banks (
            id,
            name,
            code
          )
        `, { count: 'exact' })
    } else {
      query = supabase
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
          )
        `, { count: 'exact' })
    }

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
      console.error('Requests fetch error:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch requests' },
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
    console.error('Requests fetch error:', error)
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

    const { type, id, action, reason } = await request.json()

    if (!type || !id || !action) {
      return NextResponse.json(
        { error: 'Request type, ID and action are required' },
        { status: 400 }
      )
    }

    // Validate request type
    if (!['deposit', 'withdrawal', 'sending'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
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

    // Get table name based on type
    const table = type === 'sending' ? 'send_requests' : `${type}s`

    // Get request
    const { data: existingRequest, error: requestError } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()

    if (requestError) {
      console.error('Request fetch error:', requestError)
      return NextResponse.json(
        { error: 'Failed to fetch request' },
        { status: 500 }
      )
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only process pending requests' },
        { status: 400 }
      )
    }

    // Process request based on action
    if (action === 'approve') {
      // Update request status
      const { error: updateError } = await supabase
        .from(table)
        .update({
          status: 'approved',
          processed_by: session.user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Request update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update request' },
          { status: 500 }
        )
      }

      // Create transaction if needed
      if (type === 'sending') {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            sender_id: existingRequest.sender_id,
            recipient_id: existingRequest.recipient_id,
            amount: existingRequest.amount,
            type: 'send',
            status: 'completed',
            processed_by: session.user.id
          })

        if (transactionError) {
          console.error('Transaction creation error:', transactionError)
          return NextResponse.json(
            { error: 'Failed to create transaction' },
            { status: 500 }
          )
        }
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: session.user.id,
        type: `${type}_request_approved`,
        metadata: {
          request_id: id,
          amount: existingRequest.amount,
          timestamp: new Date().toISOString()
        }
      })

      return NextResponse.json({
        message: `${type} request approved successfully`
      })

    } else {
      // Reject request
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      // Update request status
      const { error: updateError } = await supabase
        .from(table)
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_by: session.user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Request update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update request' },
          { status: 500 }
        )
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: session.user.id,
        type: `${type}_request_rejected`,
        metadata: {
          request_id: id,
          reason,
          timestamp: new Date().toISOString()
        }
      })

      return NextResponse.json({
        message: `${type} request rejected successfully`
      })
    }

  } catch (error) {
    console.error('Request processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
