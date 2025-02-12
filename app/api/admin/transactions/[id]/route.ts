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
    const { status, note } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get transaction details
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (!transaction) {
      return new NextResponse(JSON.stringify({ 
        error: 'Transaction not found' 
      }), { status: 404 })
    }

    // Update transaction
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status,
        admin_note: note,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) throw updateError

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: transaction.sender_id,
        type: 'transaction_update',
        title: 'Transaction Status Updated',
        content: `Your transaction of ${transaction.amount} ETB has been marked as ${status}.`,
        read: false
      })

    if (notificationError) throw notificationError

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      params.id,  // target is the transaction
      'UPDATE_TRANSACTION',
      JSON.stringify({
        transactionId: params.id,
        oldStatus: transaction.status,
        newStatus: status,
        note,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({
      message: 'Transaction updated successfully'
    })
  } catch (error: any) {
    console.error('Transaction update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update transaction' 
    }), { status: 500 })
  }
})
