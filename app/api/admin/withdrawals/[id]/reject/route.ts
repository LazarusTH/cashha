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
    const { reason } = await req.json()

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
          full_name
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

    // Update withdrawal status
    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        processed_at: new Date().toISOString(),
        processed_by: user.id
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Send email notification
    await sendEmail({
      to: withdrawal.user.email,
      subject: 'Withdrawal Request Rejected',
      html: `
        <h1>Your Withdrawal Request Has Been Rejected</h1>
        <p>Dear ${withdrawal.user.full_name},</p>
        <p>Your withdrawal request for ${withdrawal.amount} ETB has been rejected.</p>
        <p>Bank Details:</p>
        <ul>
          <li>Bank: ${withdrawal.bank.bank_name}</li>
          <li>Account Number: ${withdrawal.bank.account_number}</li>
          <li>Account Holder: ${withdrawal.bank.account_holder_name}</li>
        </ul>
        <p>Reason: ${reason}</p>
        <p>If you have any questions, please contact our support team.</p>
      `
    })

    // Log activity
    await supabase.from('admin_activities').insert({
      admin_id: user.id,
      type: 'withdrawal_rejected',
      description: `Rejected withdrawal request #${id} for ${withdrawal.amount} ETB. Reason: ${reason}`
    })

    return NextResponse.json({
      message: 'Withdrawal request rejected successfully',
      withdrawal: updatedWithdrawal
    })
  } catch (error: any) {
    console.error('Withdrawal rejection error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to reject withdrawal' 
    }), { status: 500 })
  }
})
