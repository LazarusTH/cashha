
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
    const period = searchParams.get('period') || 'day' // day, week, month, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get total withdrawals
    const { data: totalWithdrawals, error: totalError } = await supabase
      .from('withdrawal_requests')
      .select('amount, status')
      .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', endDate || new Date().toISOString())

    if (totalError) throw totalError

    // Calculate statistics
    const stats = {
      total_count: totalWithdrawals.length,
      total_amount: totalWithdrawals.reduce((sum, w) => sum + w.amount, 0),
      approved_count: totalWithdrawals.filter(w => w.status === 'approved').length,
      approved_amount: totalWithdrawals.filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0),
      rejected_count: totalWithdrawals.filter(w => w.status === 'rejected').length,
      rejected_amount: totalWithdrawals.filter(w => w.status === 'rejected')
        .reduce((sum, w) => sum + w.amount, 0),
      pending_count: totalWithdrawals.filter(w => w.status === 'pending').length,
      pending_amount: totalWithdrawals.filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + w.amount, 0),
    }

    // Get withdrawals by date
    const { data: withdrawalsByDate, error: timelineError } = await supabase.rpc(
      'get_withdrawals_timeline',
      {
        p_period: period,
        p_start_date: startDate,
        p_end_date: endDate
      }
    )

    if (timelineError) throw timelineError

    // Get withdrawals by bank
    const { data: withdrawalsByBank, error: bankError } = await supabase
      .from('withdrawal_requests')
      .select(`
        amount,
        status,
        bank:bank_accounts(
          bank_name
        )
      `)
      .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', endDate || new Date().toISOString())

    if (bankError) throw bankError

    // Group withdrawals by bank
    const bankStats = withdrawalsByBank.reduce((acc, w) => {
      const bankName = w.bank.bank_name
      if (!acc[bankName]) {
        acc[bankName] = {
          total_count: 0,
          total_amount: 0,
          approved_count: 0,
          approved_amount: 0,
          rejected_count: 0,
          rejected_amount: 0,
          pending_count: 0,
          pending_amount: 0,
        }
      }
      acc[bankName].total_count++
      acc[bankName].total_amount += w.amount
      if (w.status === 'approved') {
        acc[bankName].approved_count++
        acc[bankName].approved_amount += w.amount
      } else if (w.status === 'rejected') {
        acc[bankName].rejected_count++
        acc[bankName].rejected_amount += w.amount
      } else {
        acc[bankName].pending_count++
        acc[bankName].pending_amount += w.amount
      }
      return acc
    }, {})

    return NextResponse.json({
      stats,
      timeline: withdrawalsByDate,
      banks: bankStats
    })
  } catch (error: any) {
    console.error('Withdrawal stats error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch withdrawal stats' 
    }), { status: 500 })
  }
})
