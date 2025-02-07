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

    // Get user limits
    const { data: limits, error: limitsError } = await supabase
      .from('user_limits')
      .select(`
        daily_deposit_limit,
        monthly_deposit_limit,
        daily_deposits_remaining,
        monthly_deposits_remaining
      `)
      .eq('user_id', user.id)
      .single()

    if (limitsError) throw limitsError

    // Get today's deposits
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: dailyDeposits, error: dailyError } = await supabase
      .from('deposits')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', today.toISOString())

    if (dailyError) throw dailyError

    // Get this month's deposits
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyDeposits, error: monthlyError } = await supabase
      .from('deposits')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())

    if (monthlyError) throw monthlyError

    // Calculate totals and remaining limits
    const dailyTotal = dailyDeposits?.reduce((sum, d) => sum + d.amount, 0) || 0
    const monthlyTotal = monthlyDeposits?.reduce((sum, d) => sum + d.amount, 0) || 0

    const dailyRemaining = Math.max(0, limits.daily_deposit_limit - dailyTotal)
    const monthlyRemaining = Math.max(0, limits.monthly_deposit_limit - monthlyTotal)

    // Get verification requirements
    const { data: verificationLevels, error: verificationError } = await supabase
      .from('verification_levels')
      .select(`
        level,
        name,
        daily_deposit_limit,
        monthly_deposit_limit,
        requirements
      `)
      .order('level')

    if (verificationError) throw verificationError

    // Get user's verification status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_level, verification_status')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    return NextResponse.json({
      current: {
        daily_limit: limits.daily_deposit_limit,
        monthly_limit: limits.monthly_deposit_limit,
        daily_used: dailyTotal,
        monthly_used: monthlyTotal,
        daily_remaining: dailyRemaining,
        monthly_remaining: monthlyRemaining,
        daily_count: dailyDeposits?.length || 0,
        monthly_count: monthlyDeposits?.length || 0
      },
      verification: {
        current_level: profile.verification_level,
        status: profile.verification_status,
        levels: verificationLevels
      },
      history: {
        daily: dailyDeposits,
        monthly: monthlyDeposits
      }
    })
  } catch (error: any) {
    console.error('Deposit limits error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch deposit limits' 
    }), { status: 500 })
  }
})
