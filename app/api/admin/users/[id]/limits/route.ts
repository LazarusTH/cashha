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
    const { dailyLimit, monthlyLimit, sendLimit, withdrawLimit, note } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user details
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('daily_limit, monthly_limit, send_limit, withdraw_limit')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (!profile) {
      return new NextResponse(JSON.stringify({ 
        error: 'User not found' 
      }), { status: 404 })
    }

    // Update user limits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        daily_limit: dailyLimit,
        monthly_limit: monthlyLimit,
        send_limit: sendLimit,
        withdraw_limit: withdrawLimit,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) throw updateError

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.id,
        type: 'limits_update',
        title: 'Transaction Limits Updated',
        content: `Your transaction limits have been updated. New sending limit: ${sendLimit} ETB, New withdrawal limit: ${withdrawLimit} ETB.`,
        read: false
      })

    if (notificationError) throw notificationError

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      params.id,  // target is the user whose limits are being updated
      'UPDATE_USER_LIMITS',
      JSON.stringify({
        userId: params.id,
        oldLimits: {
          daily: profile.daily_limit,
          monthly: profile.monthly_limit,
          send: profile.send_limit,
          withdraw: profile.withdraw_limit
        },
        newLimits: {
          daily: dailyLimit,
          monthly: monthlyLimit,
          send: sendLimit,
          withdraw: withdrawLimit
        },
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({
      message: 'User limits updated successfully'
    })
  } catch (error: any) {
    console.error('User limits update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update user limits' 
    }), { status: 500 })
  }
})
