import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const PUT = withAdmin(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { amount, note } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user details
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (!profile) {
      return new NextResponse(JSON.stringify({ 
        error: 'User not found' 
      }), { status: 404 })
    }

    // Update user balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        balance: amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) throw updateError

    // Create balance adjustment transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        type: 'admin_adjustment',
        sender_id: user.id,
        recipient_id: params.id,
        amount: amount - profile.balance,
        status: 'completed',
        admin_note: note,
        created_by: user.id
      })

    if (transactionError) throw transactionError

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.id,
        type: 'balance_update',
        title: 'Balance Updated',
        content: `Your balance has been updated to ${amount} ETB by an administrator.`,
        read: false
      })

    if (notificationError) throw notificationError

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      params.id,  // target is the user whose balance is being updated
      'UPDATE_USER_BALANCE',
      JSON.stringify({
        userId: params.id,
        oldBalance: profile.balance,
        newBalance: amount,
        note,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({
      message: 'User balance updated successfully'
    })
  } catch (error: any) {
    console.error('User balance update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update user balance' 
    }), { status: 500 })
  }
})
