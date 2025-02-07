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

    // Get deposit request
    const { data: deposit, error: depositError } = await supabase
      .from('deposit_requests')
      .select(`
        *,
        user:profiles(
          id,
          email,
          full_name
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

    // Update deposit status
    const { data: updatedDeposit, error: updateError } = await supabase
      .from('deposit_requests')
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
      to: deposit.user.email,
      subject: 'Deposit Request Rejected',
      html: `
        <h1>Your Deposit Request Has Been Rejected</h1>
        <p>Dear ${deposit.user.full_name},</p>
        <p>Your deposit request for ${deposit.amount} ETB has been rejected.</p>
        <p>Reason: ${reason}</p>
        <p>If you have any questions, please contact our support team.</p>
      `
    })

    // Log activity
    await supabase.from('admin_activities').insert({
      admin_id: user.id,
      type: 'deposit_rejected',
      description: `Rejected deposit request #${id} for ${deposit.amount} ETB. Reason: ${reason}`
    })

    return NextResponse.json({
      message: 'Deposit request rejected successfully',
      deposit: updatedDeposit
    })
  } catch (error: any) {
    console.error('Deposit rejection error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to reject deposit' 
    }), { status: 500 })
  }
})
