import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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

    const { recipient_id, amount, description } = await request.json()

    // Validate required fields
    if (!recipient_id) {
      return NextResponse.json(
        { error: 'Recipient is required' },
        { status: 400 }
      )
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Check if recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', recipient_id)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Cannot send money to self
    if (recipient.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot send money to yourself' },
        { status: 400 }
      )
    }

    // Get sender's balance
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

    // Get sending limits
    const { data: settings } = await supabase
      .from('settings')
      .select('sending_min_amount, sending_max_amount')
      .single()

    if (settings) {
      if (amount < settings.sending_min_amount) {
        return NextResponse.json(
          { error: `Minimum sending amount is ${settings.sending_min_amount}` },
          { status: 400 }
        )
      }
      if (amount > settings.sending_max_amount) {
        return NextResponse.json(
          { error: `Maximum sending amount is ${settings.sending_max_amount}` },
          { status: 400 }
        )
      }
    }

    // Start transaction
    const { data: transfer, error: transferError } = await supabase.rpc(
      'transfer_money',
      {
        p_sender_id: session.user.id,
        p_recipient_id: recipient_id,
        p_amount: amount,
        p_description: description || null
      }
    )

    if (transferError) {
      console.error('Transfer error:', transferError)
      return NextResponse.json(
        { error: 'Failed to process transfer' },
        { status: 500 }
      )
    }

    // Create notifications
    await supabase.from('notifications').insert([
      {
        user_id: session.user.id,
        type: 'money_sent',
        title: 'Money Sent',
        content: `You sent ${amount} ETB to ${recipient.full_name}`,
        metadata: {
          transfer_id: transfer.id,
          amount,
          recipient_id: recipient.id,
          recipient_name: recipient.full_name
        }
      },
      {
        user_id: recipient.id,
        type: 'money_received',
        title: 'Money Received',
        content: `You received ${amount} ETB from ${session.user.email}`,
        metadata: {
          transfer_id: transfer.id,
          amount,
          sender_id: session.user.id,
          sender_email: session.user.email
        }
      }
    ])

    return NextResponse.json(transfer)

  } catch (error) {
    console.error('Transfer error:', error)
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

    // Get transfer history with pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type')
    const offset = (page - 1) * limit

    let query = supabase
      .from('transactions')
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          email,
          full_name
        ),
        recipient:profiles!recipient_id (
          id,
          email,
          full_name
        )
      `, { count: 'exact' })
      .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type === 'sent') {
      query = query.eq('sender_id', session.user.id)
    } else if (type === 'received') {
      query = query.eq('recipient_id', session.user.id)
    }

    const { data: transfers, error: historyError, count } = await query

    if (historyError) {
      console.error('Transfer history fetch error:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch transfer history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transfers,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Transfer history fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
