export const dynamic = 'force-dynamic';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
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

    const { amount, bankName, accountNumber, accountName, description } = await req.json()

    // Validate amount
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid amount' 
      }), { status: 400 })
    }

    // Check if bank exists
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id, name')
      .eq('name', bankName)
      .eq('is_active', true)
      .single()

    if (bankError) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid bank selected' 
      }), { status: 400 })
    }

    // Get user's balance and verification status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, verification_level, verification_status')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Check verification status
    if (profile.verification_status !== 'verified') {
      return new NextResponse(JSON.stringify({ 
        error: 'Account must be verified to withdraw' 
      }), { status: 400 })
    }

    // Check balance
    if (profile.balance < Number(amount)) {
      return new NextResponse(JSON.stringify({ 
        error: 'Insufficient balance' 
      }), { status: 400 })
    }

    // Check withdrawal limits
    const { data: limits, error: limitsError } = await supabase
      .from('user_limits')
      .select('daily_withdrawal_limit, monthly_withdrawal_limit')
      .eq('user_id', user.id)
      .single()

    if (limitsError) throw limitsError

    // Get today's withdrawals
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: dailyWithdrawals, error: dailyError } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', today.toISOString())

    if (dailyError) throw dailyError

    // Get this month's withdrawals
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyWithdrawals, error: monthlyError } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth.toISOString())

    if (monthlyError) throw monthlyError

    // Calculate totals
    const dailyTotal = dailyWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0
    const monthlyTotal = monthlyWithdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0

    // Check limits
    if (dailyTotal + Number(amount) > limits.daily_withdrawal_limit) {
      return new NextResponse(JSON.stringify({ 
        error: 'Daily withdrawal limit exceeded' 
      }), { status: 400 })
    }

    if (monthlyTotal + Number(amount) > limits.monthly_withdrawal_limit) {
      return new NextResponse(JSON.stringify({ 
        error: 'Monthly withdrawal limit exceeded' 
      }), { status: 400 })
    }

    // Start database transaction
    const { data: withdrawal, error: withdrawalError } = await supabase.rpc(
      'create_withdrawal_request',
      {
        p_user_id: user.id,
        p_amount: Number(amount),
        p_bank_id: bank.id,
        p_account_number: accountNumber,
        p_account_name: accountName,
        p_description: description
      }
    )

    if (withdrawalError) throw withdrawalError

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'withdrawal_request',
        title: 'Withdrawal Request Submitted',
        message: `Your withdrawal request for ${amount} has been submitted and is pending approval.`,
        metadata: {
          withdrawal_id: withdrawal.id,
          amount: amount,
          bank_name: bankName
        }
      })

    if (notificationError) throw notificationError

    return NextResponse.json({ withdrawal })
  } catch (error: any) {
    console.error('Withdrawal request error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to submit withdrawal request' 
    }), { status: 500 })
  }
})
