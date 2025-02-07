import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { recipientEmail, amount, description } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get sender profile
    const { data: sender, error: senderError } = await supabase
      .from('profiles')
      .select('balance, send_limit')
      .eq('id', user.id)
      .single()

    if (senderError) throw senderError

    // Check balance
    if (sender.balance < amount) {
      return new NextResponse(JSON.stringify({ 
        error: 'Insufficient balance' 
      }), { status: 400 })
    }

    // Check send limit
    if (sender.send_limit && amount > sender.send_limit) {
      return new NextResponse(JSON.stringify({ 
        error: `Amount exceeds your sending limit of ${sender.send_limit} ETB` 
      }), { status: 400 })
    }

    // Get recipient profile
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', recipientEmail)
      .single()

    if (recipientError || !recipient) {
      return new NextResponse(JSON.stringify({ 
        error: 'Recipient not found' 
      }), { status: 404 })
    }

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        type: 'send',
        sender_id: user.id,
        recipient_id: recipient.id,
        amount,
        description,
        status: 'completed'
      })
      .select()
      .single()

    if (transactionError) throw transactionError

    // Update balances
    const { error: updateError } = await supabase.rpc('transfer_money', {
      p_sender_id: user.id,
      p_recipient_id: recipient.id,
      p_amount: amount
    })

    if (updateError) throw updateError

    // Create notifications
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: user.id,
          type: 'money_sent',
          title: 'Money Sent',
          content: `You sent ${amount} ETB to ${recipient.full_name}`,
          read: false
        },
        {
          user_id: recipient.id,
          type: 'money_received',
          title: 'Money Received',
          content: `You received ${amount} ETB from ${user.email}`,
          read: false
        }
      ])

    return NextResponse.json({ transaction })
  } catch (error: any) {
    console.error('Transfer error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to send money' 
    }), { status: 500 })
  }
})
