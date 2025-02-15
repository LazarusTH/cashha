export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  // Apply rate limiting with proper configuration object
  const rateLimitResult = await rateLimit({
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    limit: 60,
    duration: 60 // 1 minute
  })
  
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'day' // day, week, month, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get total deposits
    const { data: totalDeposits, error: totalError } = await supabase
      .from('deposits')
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
        .reduce((sum, d) => sum + d.amount, 0)
    }

    // Get trend data based on period
    let interval: string
    switch (period) {
      case 'week':
        interval = '1 day'
        break
      case 'month':
        interval = '1 week'
        break
      case 'year':
        interval = '1 month'
        break
      default:
        interval = '1 hour'
    }

    const { data: trendData, error: trendError } = await supabase
      .rpc('get_deposit_trends', {
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate || new Date().toISOString(),
        p_interval: interval
      })

    if (trendError) throw trendError

    return NextResponse.json({
      stats,
      trends: trendData || []
    })

  } catch (error: any) {
    console.error('Deposit stats error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch deposit statistics' 
    }, { status: 500 })
  }
})
