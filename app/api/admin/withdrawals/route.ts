import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get withdrawals with pagination and filters
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const offset = (page - 1) * limit

    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        user:profiles(
          id,
          email,
          full_name,
          balance
        ),
        bank:bank_accounts(
          id,
          bank_name,
          account_number,
          account_holder_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: withdrawals, error: withdrawalsError, count } = await query

    if (withdrawalsError) {
      console.error('Withdrawals fetch error:', withdrawalsError)
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals' },
        { status: 500 }
      )
    }

    // Get withdrawal statistics
    const { data: stats } = await supabase.rpc('get_withdrawal_stats')

    return NextResponse.json({
      withdrawals,
      stats,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error: any) {
    console.error('Withdrawals fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch withdrawals' 
    }), { status: 500 })
  }
})

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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { withdrawal_id, action, reason, transaction_id } = await request.json()

    if (!withdrawal_id || !action) {
      return NextResponse.json(
        { error: 'Withdrawal ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Get withdrawal request
    const { data: withdrawal } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_id)
      .single()

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal request not found' },
        { status: 404 }
      )
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: 'Withdrawal request has already been processed' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      if (!transaction_id) {
        return NextResponse.json(
          { error: 'Transaction ID is required for approval' },
          { status: 400 }
        )
      }

      // Approve withdrawal
      const { error: approveError } = await supabase.rpc(
        'approve_withdrawal',
        {
          p_withdrawal_id: withdrawal_id,
          p_admin_id: session.user.id,
          p_transaction_id: transaction_id
        }
      )

      if (approveError) {
        console.error('Withdrawal approval error:', approveError)
        return NextResponse.json(
          { error: 'Failed to approve withdrawal' },
          { status: 500 }
        )
      }
    } else {
      if (!reason) {
        return NextResponse.json(
          { error: 'Reason is required for rejection' },
          { status: 400 }
        )
      }

      // Reject withdrawal
      const { error: rejectError } = await supabase.rpc(
        'reject_withdrawal',
        {
          p_withdrawal_id: withdrawal_id,
          p_admin_id: session.user.id,
          p_reason: reason
        }
      )

      if (rejectError) {
        console.error('Withdrawal rejection error:', rejectError)
        return NextResponse.json(
          { error: 'Failed to reject withdrawal' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Withdrawal update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
