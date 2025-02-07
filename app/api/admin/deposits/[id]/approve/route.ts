import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { sendEmail } from '@/lib/utils/email'

export const PUT = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id } = req.url.split('/').slice(-2)[0]
    const { transactionId } = await req.json()

    // Get admin user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get deposit request
    const { data: deposit, error: depositError } = await supabase
      .from('deposit_requests')
      .select(`
        *,
        user:profiles(
          id,
          email,
          full_name,
          balance
        )
      `)
      .eq('id', id)
      .single()

    if (depositError) throw depositError
    if (!deposit) {
      return new NextResponse(JSON.stringify({ error: 'Deposit request not found' }), { status: 404 })
    }
    if (deposit.status !== 'pending') {
      return new NextResponse(JSON.stringify({ error: 'Deposit request already processed' }), { status: 400 })
    }

    // Start transaction
    const { data: transaction, error: transactionError } = await supabase.rpc('approve_deposit', {
      p_deposit_id: id,
      p_transaction_id: transactionId,
      p_admin_id: user.id,
      p_amount: deposit.amount
    })

    if (transactionError) throw transactionError

    // Send email notification
    await sendEmail({
      to: deposit.user.email,
      subject: 'Deposit Request Approved',
      html: `
        <h1>Your Deposit Request Has Been Approved</h1>
        <p>Dear ${deposit.user.full_name},</p>
        <p>Your deposit request for ${deposit.amount} ETB has been approved.</p>
        <p>Transaction ID: ${transactionId}</p>
        <p>Your new balance is: ${deposit.user.balance + deposit.amount} ETB</p>
      `
    })

    // Log activity
    await supabase.from('admin_activities').insert({
      admin_id: user.id,
      type: 'deposit_approved',
      description: `Approved deposit request #${id} for ${deposit.amount} ETB`
    })

    return NextResponse.json({
      message: 'Deposit request approved successfully',
      deposit: transaction
    })
  } catch (error: any) {
    console.error('Deposit approval error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to approve deposit' 
    }), { status: 500 })
  }
})
