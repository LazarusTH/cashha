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
    const { amount, bankId, accountNumber, accountName, description } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, withdraw_limit')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Validate amount
    if (!amount || amount <= 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid amount' 
      }), { status: 400 })
    }

    // Check balance
    if (profile.balance < amount) {
      return new NextResponse(JSON.stringify({ 
        error: 'Insufficient balance' 
      }), { status: 400 })
    }

    // Check withdraw limit
    if (profile.withdraw_limit && amount > profile.withdraw_limit) {
      return new NextResponse(JSON.stringify({ 
        error: `Amount exceeds your withdrawal limit of ${profile.withdraw_limit} ETB` 
      }), { status: 400 })
    }

    // Validate bank exists
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id, name')
      .eq('id', bankId)
      .single()

    if (bankError || !bank) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid bank selected' 
      }), { status: 400 })
    }

    // Create withdrawal request
    const { data: withdrawal, error } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount,
        bank_id: bankId,
        account_number: accountNumber,
        account_name: accountName,
        description,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Create notification for admin
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'withdrawal_request',
        title: 'New Withdrawal Request',
        content: `New withdrawal request of ${amount} ETB from ${user.email}`,
        role: 'admin'
      })

    if (notificationError) throw notificationError

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'withdrawal_request',
      description: `Requested withdrawal of ${amount} ETB to ${bank.name}`
    })

    return NextResponse.json({ withdrawal })
  } catch (error: any) {
    console.error('Withdrawal request error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to create withdrawal request' 
    }), { status: 500 })
  }
})
