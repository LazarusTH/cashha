import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const DELETE = withAdmin(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

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

    // Check if user has any active transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id')
      .or(`sender_id.eq.${params.id},recipient_id.eq.${params.id}`)
      .eq('status', 'pending')
      .limit(1)

    if (transactionError) throw transactionError

    if (transactions && transactions.length > 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot delete user with pending transactions' 
      }), { status: 400 })
    }

    // Check if user has any balance
    if (profile.balance > 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot delete user with non-zero balance' 
      }), { status: 400 })
    }

    // Delete user's data
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id)

    if (deleteError) throw deleteError

    // Delete user's auth account
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(params.id)

    if (authDeleteError) throw authDeleteError

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      params.id,  // target is the user being deleted
      'DELETE_USER',
      JSON.stringify({
        userId: params.id,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({
      message: 'User deleted successfully'
    })
  } catch (error: any) {
    console.error('User deletion error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to delete user' 
    }), { status: 500 })
  }
})
