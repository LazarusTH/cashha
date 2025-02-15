import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const PUT = withUser(async (req: Request, { params }: { params: { id: string } }) => {
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
      .select('id, bank:banks(name)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bank account not found' 
      }), { status: 404 })
    }

    // Update all user's bank accounts to not default
    const { error: updateError1 } = await supabase
      .from('user_banks')
      .update({ is_default: false })
      .eq('user_id', user.id)

    if (updateError1) throw updateError1

    // Set selected account as default
    const { error: updateError2 } = await supabase
      .from('user_banks')
      .update({ is_default: true })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (updateError2) throw updateError2

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'bank_account_default',
      description: `Set ${account.bank.name} as default bank account`
    })

    return NextResponse.json({
      message: 'Default bank account updated successfully'
    })
  } catch (error: any) {
    console.error('Bank account default update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update default bank account' 
    }), { status: 500 })
  }
})
