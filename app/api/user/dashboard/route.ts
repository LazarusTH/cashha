import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, send_limit, withdraw_limit')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Get transaction totals
    const { data: totals, error: totalsError } = await supabase
      .rpc('get_user_transaction_totals', { user_id: user.id })

    if (totalsError) throw totalsError

    // Get monthly transaction history for chart
    const { data: monthlyHistory, error: historyError } = await supabase
      .rpc('get_user_monthly_transactions', { user_id: user.id })

    if (historyError) throw historyError

    // Get recent transactions
    const { data: recentTransactions, error: recentError } = await supabase
      .from('transactions')
      .select(`
        *,
        sender:profiles!sender_id(full_name, email),
        recipient:profiles!recipient_id(full_name, email)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    return NextResponse.json({
      currentBalance: profile.balance,
      sendLimit: profile.send_limit,
      withdrawLimit: profile.withdraw_limit,
      totalSent: totals.total_sent || 0,
      totalReceived: totals.total_received || 0,
      totalWithdrawn: totals.total_withdrawn || 0,
      monthlyHistory,
      recentTransactions
    })
  } catch (error: any) {
    console.error('Dashboard data fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch dashboard data' 
    }), { status: 500 })
  }
})
