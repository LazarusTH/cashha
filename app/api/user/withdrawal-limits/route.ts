import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's withdrawal limits from the database
    const { data: userLimits, error: limitsError } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    if (limitsError) throw limitsError

    // Get today's withdrawals
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: dailyWithdrawals, error: dailyError } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', session.user.id)
      .gte('created_at', today.toISOString())
      .eq('status', 'approved')
    
    if (dailyError) throw dailyError

    // Get this month's withdrawals
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyWithdrawals, error: monthlyError } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', session.user.id)
      .gte('created_at', firstDayOfMonth.toISOString())
      .eq('status', 'approved')
    
    if (monthlyError) throw monthlyError

    // Calculate used amounts
    const dailyUsed = dailyWithdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0)
    const monthlyUsed = monthlyWithdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0)

    // Return withdrawal limits and usage
    return NextResponse.json({
      minAmount: userLimits?.min_withdrawal_amount || 100,
      maxAmount: userLimits?.max_withdrawal_amount || 50000,
      dailyLimit: userLimits?.daily_withdrawal_limit || 25000,
      dailyUsed,
      monthlyLimit: userLimits?.monthly_withdrawal_limit || 500000,
      monthlyUsed
    })

  } catch (error) {
    console.error('Error fetching withdrawal limits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch withdrawal limits' },
      { status: 500 }
    )
  }
}
