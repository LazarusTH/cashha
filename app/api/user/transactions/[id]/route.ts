import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withUser(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get transaction with all related data
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        sender:profiles!sender_id(
          id,
          email,
          full_name
        ),
        recipient:profiles!recipient_id(
          id,
          email,
          full_name
        ),
        bank:banks(
          id,
          name,
          code
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !transaction) {
      return new NextResponse(JSON.stringify({ 
        error: 'Transaction not found' 
      }), { status: 404 })
    }

    return NextResponse.json({ transaction })
  } catch (error: any) {
    console.error('Transaction fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch transaction' 
    }), { status: 500 })
  }
})

export const PUT = withUser(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !transaction) {
      return new NextResponse(JSON.stringify({ 
        error: 'Transaction not found' 
      }), { status: 404 })
    }

    // Check if transaction can be cancelled
    if (transaction.status !== 'pending') {
      return new NextResponse(JSON.stringify({ 
        error: 'Only pending transactions can be cancelled' 
      }), { status: 400 })
    }

    // Cancel transaction
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'transaction_cancelled',
      description: `Cancelled transaction #${transaction.reference}`
    })

    return NextResponse.json({
      message: 'transaction cancelled successfully'
    })
  } catch (error: any) {
    console.error('Transaction cancellation error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to cancel transaction' 
    }), { status: 500 })
  }
})
