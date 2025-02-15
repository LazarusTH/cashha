import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { amount, fullName, method, metadata } = await req.json()

    // Validate amount
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid amount' 
      }), { status: 400 })
    }

    // Check deposit limits
    const { data: limits, error: limitsError } = await supabase
      .from('user_limits')
      .select('daily_deposit_limit, monthly_deposit_limit')
      .eq('user_id', user.id)
      .single()

    if (limitsError) throw limitsError

    // Get today's deposits
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: dailyDeposits, error: dailyError } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', today.toISOString())
      .select('amount')

    if (dailyError) throw dailyError

    // Get this month's deposits
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyDeposits, error: monthlyError } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())
      .select('amount')

    if (monthlyError) throw monthlyError

    // Calculate totals
    const dailyTotal = dailyDeposits?.reduce((sum, d) => sum + d.amount, 0) || 0
    const monthlyTotal = monthlyDeposits?.reduce((sum, d) => sum + d.amount, 0) || 0

    // Check limits
    if (dailyTotal + Number(amount) > limits.daily_deposit_limit) {
      return new NextResponse(JSON.stringify({ 
        error: 'Daily deposit limit exceeded' 
      }), { status: 400 })
    }

    if (monthlyTotal + Number(amount) > limits.monthly_deposit_limit) {
      return new NextResponse(JSON.stringify({ 
        error: 'Monthly deposit limit exceeded' 
      }), { status: 400 })
    }

    // Create deposit request
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id: user.id,
        amount: Number(amount),
        full_name: fullName,
        method: method || 'bank_transfer',
        status: 'pending',
        metadata
      })
      .select()
      .single()

    if (depositError) throw depositError

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'deposit_request',
        title: 'Deposit Request Submitted',
        message: `Your deposit request for ${amount} has been submitted and is pending approval.`,
        metadata: {
          deposit_id: deposit.id,
          amount: amount
        }
      })

    if (notificationError) throw notificationError

    return NextResponse.json({ deposit })
  } catch (error: any) {
    console.error('Deposit request error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to submit deposit request' 
    }), { status: 500 })
  }
})
