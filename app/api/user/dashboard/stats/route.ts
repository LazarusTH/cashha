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

    // Get user profile with balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Get transaction totals
    const { data: totals, error: totalsError } = await supabase.rpc(
      'get_user_transaction_totals',
      { p_user_id: user.id }
    )

    if (totalsError) throw totalsError

    // Get recent transactions
    const { data: recentTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        type,
        amount,
        status,
        created_at,
        sender:profiles!sender_id(email),
        recipient:profiles!recipient_id(email)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5)

    if (transactionsError) throw transactionsError

    return NextResponse.json({
      currentBalance: profile.balance,
      totalSent: totals.total_sent || 0,
      totalReceived: totals.total_received || 0,
      totalWithdrawn: totals.total_withdrawn || 0,
      recentTransactions
    })
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch dashboard stats' 
    }), { status: 500 })
  }
})
