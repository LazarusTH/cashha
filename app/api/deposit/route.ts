import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())
    const { amount, fullName } = await request.json()

    // Validate input
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create deposit transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
        type: 'deposit',
        amount: amount,
        status: 'pending',
        metadata: {
          depositor_name: fullName
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Deposit transaction error:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create deposit' },
        { status: 500 }
      )
    }

    // Create notification for admin
    await supabase
      .from('notifications')
      .insert({
        user_id: session.user.id,
        type: 'deposit_request',
        title: 'New Deposit Request',
        content: `${fullName} has requested a deposit of ${amount}`,
        metadata: {
          transaction_id: transaction.id
        }
      })

    return NextResponse.json({ 
      success: true,
      transaction: transaction
    })

  } catch (error) {
    console.error('Deposit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookies())

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const transactions = await supabase
      .from('transactions')
      .select()
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json(transactions.data)
  } catch (error) {
    console.error('Error fetching deposit history:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
