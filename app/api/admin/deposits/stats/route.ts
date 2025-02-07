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
    const period = searchParams.get('period') || 'day' // day, week, month, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get total deposits
    const { data: totalDeposits, error: totalError } = await supabase
      .from('deposit_requests')
      .select('amount, status')
      .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', endDate || new Date().toISOString())

    if (totalError) throw totalError

    // Calculate statistics
    const stats = {
      total_count: totalDeposits.length,
      total_amount: totalDeposits.reduce((sum, d) => sum + d.amount, 0),
      approved_count: totalDeposits.filter(d => d.status === 'approved').length,
      approved_amount: totalDeposits.filter(d => d.status === 'approved')
        .reduce((sum, d) => sum + d.amount, 0),
      rejected_count: totalDeposits.filter(d => d.status === 'rejected').length,
      rejected_amount: totalDeposits.filter(d => d.status === 'rejected')
        .reduce((sum, d) => sum + d.amount, 0),
      pending_count: totalDeposits.filter(d => d.status === 'pending').length,
      pending_amount: totalDeposits.filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + d.amount, 0),
    }

    // Get deposits by date
    const { data: depositsByDate, error: timelineError } = await supabase.rpc(
      'get_deposits_timeline',
      {
        p_period: period,
        p_start_date: startDate,
        p_end_date: endDate
      }
    )

    if (timelineError) throw timelineError

    return NextResponse.json({
      stats,
      timeline: depositsByDate
    })
  } catch (error: any) {
    console.error('Deposit stats error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch deposit stats' 
    }), { status: 500 })
  }
})
