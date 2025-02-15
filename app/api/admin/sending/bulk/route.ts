export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { recipients, amount, description } = await req.json()

    // Validate recipients
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', recipients.map((r: any) => r.email))

    if (!users || users.length !== recipients.length) {
      return new NextResponse(JSON.stringify({ 
        error: 'One or more recipients not found' 
      }), { status: 400 })
    }

    // Create transactions for each recipient
    const transactions = users.map((user: any) => ({
      sender_id: null, // System transfer
      recipient_id: user.id,
      amount,
      type: 'admin_transfer',
      status: 'completed',
      description,
      created_by: user.id
    }))

    const { error: txError } = await supabase
      .from('transactions')
      .insert(transactions)

    if (txError) throw txError

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      'system',  // use 'system' as target for bulk operations
      'BULK_SEND',
      JSON.stringify({
        recipientCount: recipients.length,
        totalAmount: amount * recipients.length,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({
      message: 'Bulk transfer completed successfully',
      count: recipients.length
    })
  } catch (error: any) {
    console.error('Bulk send error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to process bulk transfer' 
    }), { status: 500 })
  }
})
