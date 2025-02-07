import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
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
    const period = searchParams.get('period') || 'week' // day, week, month, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get transaction timeline data
    const { data: chartData, error } = await supabase.rpc(
      'get_user_transaction_timeline',
      {
        p_user_id: user.id,
        p_period: period,
        p_start_date: startDate,
        p_end_date: endDate
      }
    )

    if (error) throw error

    // Transform data for the chart
    const transformedData = chartData.map((item: any) => ({
      date: item.date,
      sent: Math.abs(item.sent_amount || 0),
      received: item.received_amount || 0,
      withdrawn: Math.abs(item.withdrawn_amount || 0),
      deposited: item.deposited_amount || 0,
      balance: item.balance || 0
    }))

    // Get balance trend
    const { data: balanceTrend, error: trendError } = await supabase.rpc(
      'get_user_balance_trend',
      {
        p_user_id: user.id,
        p_period: period,
        p_start_date: startDate,
        p_end_date: endDate
      }
    )

    if (trendError) throw trendError

    return NextResponse.json({
      chartData: transformedData,
      trend: {
        balance_change: balanceTrend.balance_change || 0,
        balance_change_percentage: balanceTrend.balance_change_percentage || 0,
        transaction_volume_change: balanceTrend.transaction_volume_change || 0,
        transaction_volume_change_percentage: balanceTrend.transaction_volume_change_percentage || 0
      }
    })
  } catch (error: any) {
    console.error('Chart data error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch chart data' 
    }), { status: 500 })
  }
})
