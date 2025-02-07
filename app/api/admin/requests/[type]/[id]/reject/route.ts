import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const PUT = withAdmin(async (req: Request, { params }: { params: { type: string; id: string } }) => {
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

    // Validate request type
    const validTypes = ['deposit', 'withdrawal', 'sending']
    if (!validTypes.includes(params.type)) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid request type' 
      }), { status: 400 })
    }

    // Get request details
    const { data: request, error: fetchError } = await supabase
      .from(`${params.type}_requests`)
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    if (!request) {
      return new NextResponse(JSON.stringify({ 
        error: 'Request not found' 
      }), { status: 404 })
    }

    // Update request status
    const { error: updateError } = await supabase
      .from(`${params.type}_requests`)
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
        user_id: request.user_id || request.sender_id,
        type: 'request_rejected',
        title: `${params.type.charAt(0).toUpperCase() + params.type.slice(1)} Request Rejected`,
        content: `Your ${params.type} request for ${request.amount} ETB has been rejected. Reason: ${reason}`,
        read: false
      })

    if (notificationError) throw notificationError

    // Log action
    await logAdminAction(user.id, `REJECT_${params.type.toUpperCase()}_REQUEST`, {
      requestId: params.id,
      amount: request.amount,
      reason,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Request rejected successfully'
    })
  } catch (error: any) {
    console.error('Request rejection error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to reject request' 
    }), { status: 500 })
  }
})
