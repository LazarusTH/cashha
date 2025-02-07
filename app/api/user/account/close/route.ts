import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logAdminAction } from '@/lib/utils/audit-logger'

export async function POST(req: Request) {
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

    // Check for pending transactions
    const { data: pendingTx, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .in('status', ['pending', 'processing'])
      .limit(1)

    if (txError) throw txError

    if (pendingTx?.length > 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot close account with pending transactions' 
      }), { status: 400 })
    }

    // Update user account settings
    const { error: settingsError } = await supabase
      .from('user_account_settings')
      .upsert({
        user_id: user.id,
        account_closure_reason: reason,
        account_closure_date: new Date().toISOString()
      })

    if (settingsError) throw settingsError

    // Update user profile status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'closed' })
      .eq('id', user.id)

    if (profileError) throw profileError

    // Log action
    await logAdminAction(user.id, 'ACCOUNT_CLOSED', {
      reason,
      timestamp: new Date().toISOString()
    })

    // Sign out user
    await supabase.auth.signOut()

    return NextResponse.json({
      message: 'Account closed successfully'
    })
  } catch (error: any) {
    console.error('Account closure error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to close account' 
    }), { status: 500 })
  }
}
