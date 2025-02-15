import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
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

    // Get user limits
    const { data: limits, error: limitsError } = await supabase
      .from('user_limits')
      .select(`
        daily_withdrawal_limit,
        monthly_withdrawal_limit,
        daily_withdrawals_remaining,
        monthly_withdrawals_remaining
      `)
      .eq('user_id', user.id)
      .single()

    if (limitsError) throw limitsError

    // Get today's withdrawals
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: dailyWithdrawals, error: dailyError } = await supabase
      .from('withdrawals')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', today.toISOString())

    if (dailyError) throw dailyError

    // Get this month's withdrawals
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyWithdrawals, error: monthlyError } = await supabase
      .from('withdrawals')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())

    if (monthlyError) throw monthlyError

    // Calculate totals and remaining limits
    const dailyTotal = dailyWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0
    const monthlyTotal = monthlyWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0

    const dailyRemaining = Math.max(0, limits.daily_withdrawal_limit - dailyTotal)
    const monthlyRemaining = Math.max(0, limits.monthly_withdrawal_limit - monthlyTotal)

    // Get user's balance and verification status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, verification_level, verification_status')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Get verification level requirements
    const { data: verificationLevels, error: verificationError } = await supabase
      .from('verification_levels')
      .select(`
        level,
        name,
        daily_withdrawal_limit,
        monthly_withdrawal_limit,
        requirements
      `)
      .order('level')

    if (verificationError) throw verificationError

    // Get withdrawal fees
    const { data: fees, error: feesError } = await supabase
      .from('withdrawal_fees')
      .select(`
        method,
        fixed_fee,
        percentage_fee,
        min_fee,
        max_fee
      `)

    if (feesError) throw feesError

    return NextResponse.json({
      current: {
        balance: profile.balance,
        daily_limit: limits.daily_withdrawal_limit,
        monthly_limit: limits.monthly_withdrawal_limit,
        daily_used: dailyTotal,
        monthly_used: monthlyTotal,
        daily_remaining: dailyRemaining,
        monthly_remaining: monthlyRemaining,
        daily_count: dailyWithdrawals?.length || 0,
        monthly_count: monthlyWithdrawals?.length || 0
      },
      verification: {
        current_level: profile.verification_level,
        status: profile.verification_status,
        levels: verificationLevels
      },
      fees,
      history: {
        daily: dailyWithdrawals,
        monthly: monthlyWithdrawals
      }
    })
  } catch (error: any) {
    console.error('Withdrawal limits error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch withdrawal limits' 
    }), { status: 500 })
  }
})
