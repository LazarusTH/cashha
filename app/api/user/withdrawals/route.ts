import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET handler for fetching withdrawal history
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select(`
        *,
        users (
          full_name,
          email
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json(withdrawals)
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch withdrawals' },
      { status: 500 }
    )
  }
}

// POST handler for creating new withdrawals
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, bankName, accountNumber, accountName, description } = body

    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'Bank details are required' },
        { status: 400 }
      )
    }

    // Check withdrawal limits
    const { data: limits } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    // Get today's withdrawals
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: dailyWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', session.user.id)
      .gte('created_at', today.toISOString())
      .eq('status', 'approved')

    const dailyTotal = dailyWithdrawals?.reduce((sum, wit) => sum + wit.amount, 0) || 0

    if (dailyTotal + Number(amount) > (limits?.daily_withdrawal_limit || 25000)) {
      return NextResponse.json(
        { error: 'Daily withdrawal limit exceeded' },
        { status: 400 }
      )
    }

    // Check user balance
    const { data: balance } = await supabase
      .rpc('get_user_balance', { user_id: session.user.id })

    if (!balance || balance < Number(amount)) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Create the withdrawal
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: session.user.id,
        amount: Number(amount),
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        description,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(withdrawal)
  } catch (error) {
    console.error('Error creating withdrawal:', error)
    return NextResponse.json(
      { error: 'Failed to create withdrawal' },
      { status: 500 }
    )
  }
}
