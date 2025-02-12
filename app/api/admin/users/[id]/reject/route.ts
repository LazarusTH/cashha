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
    const { reason } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user details
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (!profile) {
      return new NextResponse(JSON.stringify({ 
        error: 'User not found' 
      }), { status: 404 })
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        rejected_by: user.id,
        rejected_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) throw updateError

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.id,
        type: 'account_rejected',
        title: 'Account Verification Failed',
        content: `Your account verification failed. Reason: ${reason}`,
        read: false
      })

    if (notificationError) throw notificationError

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      params.id,  // target is the user being rejected
      'REJECT_USER',
      JSON.stringify({
        userId: params.id,
        reason,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({
      message: 'User rejected successfully'
    })
  } catch (error: any) {
    console.error('User rejection error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to reject user' 
    }), { status: 500 })
  }
})
