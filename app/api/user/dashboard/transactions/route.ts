import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        id,
        type,
        amount,
        status,
        created_at,
        metadata,
        sender:profiles!sender_id(id, email, full_name),
        recipient:profiles!recipient_id(id, email, full_name)
      `, { count: 'exact' })
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }
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
    const { data: transactions, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    // Get transaction statistics
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_user_transaction_stats',
      {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate
      }
    )

    if (statsError) throw statsError

    return NextResponse.json({
      transactions,
      total: count || 0,
      page,
      limit,
      stats: {
        total_count: stats.total_count || 0,
        total_amount: stats.total_amount || 0,
        successful_count: stats.successful_count || 0,
        successful_amount: stats.successful_amount || 0,
        failed_count: stats.failed_count || 0,
        failed_amount: stats.failed_amount || 0,
        by_type: stats.by_type || {}
      }
    })
  } catch (error: any) {
    console.error('Transactions fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch transactions' 
    }), { status: 500 })
  }
})
