import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's deposit limits from the database
    const { data: userLimits, error: limitsError } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    if (limitsError) throw limitsError

    // Get today's deposits
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: dailyDeposits, error: dailyError } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', session.user.id)
      .gte('created_at', today.toISOString())
      .eq('status', 'approved')
    
    if (dailyError) throw dailyError

    // Get this month's deposits
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyDeposits, error: monthlyError } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', session.user.id)
      .gte('created_at', firstDayOfMonth.toISOString())
      .eq('status', 'approved')
    
    if (monthlyError) throw monthlyError

    // Calculate used amounts
    const dailyUsed = dailyDeposits.reduce((sum, deposit) => sum + deposit.amount, 0)
    const monthlyUsed = monthlyDeposits.reduce((sum, deposit) => sum + deposit.amount, 0)

    // Return deposit limits and usage
    return NextResponse.json({
      minAmount: userLimits?.min_deposit_amount || 100,
      maxAmount: userLimits?.max_deposit_amount || 100000,
      dailyLimit: userLimits?.daily_deposit_limit || 50000,
      dailyUsed,
      monthlyLimit: userLimits?.monthly_deposit_limit || 1000000,
      monthlyUsed
    })

  } catch (error) {
    console.error('Error fetching deposit limits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deposit limits' },
      { status: 500 }
    )
  }
}
