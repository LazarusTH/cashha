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
    const { amount, fullName } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid amount' 
      }), { status: 400 })
    }

    // Create deposit request
    const { data: deposit, error } = await supabase
      .from('deposit_requests')
      .insert({
        user_id: user.id,
        amount,
        depositor_name: fullName,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Create notification for admin
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'deposit_request',
        title: 'New Deposit Request',
        content: `New deposit request of ${amount} ETB from ${user.email}`,
        role: 'admin'
      })

    if (notificationError) throw notificationError

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'deposit_request',
      description: `Requested deposit of ${amount} ETB`
    })

    return NextResponse.json({ deposit })
  } catch (error: any) {
    console.error('Deposit request error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to create deposit request' 
    }), { status: 500 })
  }
})
