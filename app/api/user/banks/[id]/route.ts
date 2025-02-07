import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const DELETE = withUser(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get bank account
    const { data: account, error: accountError } = await supabase
      .from('user_banks')
      .select('id, is_default, bank:banks(name)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bank account not found' 
      }), { status: 404 })
    }

    // Check if account is default
    if (account.is_default) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot delete default bank account' 
      }), { status: 400 })
    }

    // Check for pending withdrawals
    const { count, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact' })
      .eq('user_bank_id', params.id)
      .eq('status', 'pending')

    if (withdrawalError) throw withdrawalError

    if (count && count > 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot delete bank account with pending withdrawals' 
      }), { status: 400 })
    }

    // Delete bank account
    const { error: deleteError } = await supabase
      .from('user_banks')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) throw deleteError

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'bank_account_deleted',
      description: `Deleted bank account: ${account.bank.name}`
    })

    return NextResponse.json({
      message: 'Bank account deleted successfully'
    })
  } catch (error: any) {
    console.error('Bank account deletion error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to delete bank account' 
    }), { status: 500 })
  }
})
