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

    // Get withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        user:profiles(
          id,
          email,
          full_name,
          balance
        ),
        bank:bank_accounts(
          id,
          bank_name,
          account_number,
          account_holder_name
        )
      `)
      .eq('id', id)
      .single()

    if (withdrawalError) throw withdrawalError
    if (!withdrawal) {
      return new NextResponse(JSON.stringify({ error: 'Withdrawal request not found' }), { status: 404 })
    }
    if (withdrawal.status !== 'pending') {
      return new NextResponse(JSON.stringify({ error: 'Withdrawal request already processed' }), { status: 400 })
    }

    // Check if user has sufficient balance
    if (withdrawal.user.balance < withdrawal.amount) {
      return new NextResponse(JSON.stringify({ error: 'Insufficient balance' }), { status: 400 })
    }

    // Start transaction
    const { data: transaction, error: transactionError } = await supabase.rpc('approve_withdrawal', {
      p_withdrawal_id: id,
      p_transaction_id: transactionId,
      p_admin_id: user.id,
      p_amount: withdrawal.amount
    })

    if (transactionError) throw transactionError

    // Send email notification
    await sendEmail({
      to: withdrawal.user.email,
      subject: 'Withdrawal Request Approved',
      html: `
        <h1>Your Withdrawal Request Has Been Approved</h1>
        <p>Dear ${withdrawal.user.full_name},</p>
        <p>Your withdrawal request for ${withdrawal.amount} ETB has been approved.</p>
        <p>Transaction ID: ${transactionId}</p>
        <p>Bank Details:</p>
        <ul>
          <li>Bank: ${withdrawal.bank.bank_name}</li>
          <li>Account Number: ${withdrawal.bank.account_number}</li>
          <li>Account Holder: ${withdrawal.bank.account_holder_name}</li>
        </ul>
        <p>Your new balance is: ${withdrawal.user.balance - withdrawal.amount} ETB</p>
      `
    })

    // Log activity
    await supabase.from('admin_activities').insert({
      admin_id: user.id,
      type: 'withdrawal_approved',
      description: `Approved withdrawal request #${id} for ${withdrawal.amount} ETB`
    })

    return NextResponse.json({
      message: 'Withdrawal request approved successfully',
      withdrawal: transaction
    })
  } catch (error: any) {
    console.error('Withdrawal approval error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to approve withdrawal' 
    }), { status: 500 })
  }
})
