import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { amount, bank_account_id, description } = await request.json()

    // Validate required fields
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!bank_account_id) {
      return NextResponse.json(
        { error: 'Bank account is required' },
        { status: 400 }
      )
    }

    // Verify bank account belongs to user
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .eq('user_id', session.user.id)
      .single()

    if (bankError || !bankAccount) {
      return NextResponse.json(
        { error: 'Invalid bank account' },
        { status: 400 }
      )
    }

    // Get user's balance
    const { data: balance, error: balanceError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', session.user.id)
      .single()

    if (balanceError) {
      console.error('Balance fetch error:', balanceError)
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: 500 }
      )
    }

    if (!balance || balance.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Get withdrawal limits
    const { data: settings } = await supabase
      .from('settings')
      .select('withdrawal_min_amount, withdrawal_max_amount')
      .single()

    if (settings) {
      if (amount < settings.withdrawal_min_amount) {
        return NextResponse.json(
          { error: `Minimum withdrawal amount is ${settings.withdrawal_min_amount}` },
          { status: 400 }
        )
      }
      if (amount > settings.withdrawal_max_amount) {
        return NextResponse.json(
          { error: `Maximum withdrawal amount is ${settings.withdrawal_max_amount}` },
          { status: 400 }
        )
      }
    }

    // Start transaction
    const { data: withdrawal, error: withdrawalError } = await supabase.rpc(
      'create_withdrawal_request',
      {
        p_user_id: session.user.id,
        p_amount: amount,
        p_bank_account_id: bank_account_id,
        p_description: description || null
      }
    )

    if (withdrawalError) {
      console.error('Withdrawal creation error:', withdrawalError)
      return NextResponse.json(
        { error: 'Failed to create withdrawal request' },
        { status: 500 }
      )
    }

    // Create notification for admins
    await supabase
      .from('notifications')
      .insert({
        type: 'withdrawal_request',
        user_id: null, // For all admins
        title: 'New Withdrawal Request',
        content: `New withdrawal request of ${amount} ETB from ${session.user.email}`,
        metadata: {
          withdrawal_id: withdrawal.id,
          amount,
          user_id: session.user.id
        }
      })

    return NextResponse.json(withdrawal)

  } catch (error) {
    console.error('Withdrawal request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get withdrawal history with pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    let query = supabase
      .from('withdrawals')
      .select(`
        *,
        bank_accounts (
          id,
          bank_id,
          account_number,
          account_name,
          banks (
            id,
            name,
            logo_url
          )
        )
      `, { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: withdrawals, error: historyError, count } = await query

    if (historyError) {
      console.error('Withdrawal history fetch error:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch withdrawal history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      withdrawals,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Withdrawal history fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
