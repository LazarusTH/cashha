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
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('deposit_requests')
      .select(`
        *,
        user:profiles(
          id,
          email,
          full_name
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`user.email.ilike.%${search}%,user.full_name.ilike.%${search}%`)
    }

    // Get paginated results
    const { data: deposits, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      deposits,
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('Deposits fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch deposits' 
    }), { status: 500 })
  }
})

export const PUT = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { depositId, action, reason, transactionId } = await req.json()

    if (!depositId || !action) {
      return NextResponse.json(
        { error: 'Deposit ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Get deposit request
    const { data: deposit, error: depositError } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('id', depositId)
      .single()

    if (depositError) {
      console.error('Deposit fetch error:', depositError)
      return NextResponse.json(
        { error: 'Failed to fetch deposit request' },
        { status: 500 }
      )
    }

    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit request not found' },
        { status: 404 }
      )
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json(
        { error: 'Deposit request has already been processed' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      if (!transactionId) {
        return NextResponse.json(
          { error: 'Transaction ID is required for approval' },
          { status: 400 }
        )
      }

      // Start a transaction
      const { data: { session } } = await supabase.auth.getSession()
      const { error: approveError } = await supabase.rpc(
        'approve_deposit',
        {
          p_deposit_id: depositId,
          p_admin_id: session?.user.id,
          p_transaction_id: transactionId
        }
      )

      if (approveError) {
        console.error('Deposit approval error:', approveError)
        return NextResponse.json(
          { error: 'Failed to approve deposit' },
          { status: 500 }
        )
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: session?.user.id,
        type: 'deposit_approved',
        metadata: {
          deposit_id: depositId,
          transaction_id: transactionId,
          amount: deposit.amount,
          timestamp: new Date().toISOString()
        }
      })

      return NextResponse.json({
        message: 'Deposit request approved successfully'
      })

    } else {
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      // Reject deposit
      const { data: { session } } = await supabase.auth.getSession()
      const { error: rejectError } = await supabase
        .from('deposit_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_by: session?.user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', depositId)

      if (rejectError) {
        console.error('Deposit rejection error:', rejectError)
        return NextResponse.json(
          { error: 'Failed to reject deposit' },
          { status: 500 }
        )
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: session?.user.id,
        type: 'deposit_rejected',
        metadata: {
          deposit_id: depositId,
          reason,
          amount: deposit.amount,
          timestamp: new Date().toISOString()
        }
      })

      return NextResponse.json({
        message: 'Deposit request rejected successfully'
      })
    }

  } catch (error: any) {
    console.error('Deposit processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
