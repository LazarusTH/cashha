import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const PUT = withAuth(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get current bank account
    const { data: account, error: accountError } = await supabase
      .from('user_bank_accounts')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (accountError || !account) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bank account not found' 
      }), { status: 404 })
    }

    // Verify ownership
    if (account.user_id !== user.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized' 
      }), { status: 403 })
    }

    // Start transaction to update default status
    const { data, error } = await supabase.rpc('set_default_bank_account', {
      p_user_id: user.id,
      p_account_id: params.id
    })

    if (error) throw error

    // Get updated accounts
    const { data: accounts, error: fetchError } = await supabase
      .from('user_bank_accounts')
      .select(`
        id,
        bank_id,
        account_number,
        account_name,
        is_default,
        is_verified,
        verification_status,
        last_used_at,
        created_at,
        banks (
          id,
          name,
          logo_url,
          swift_code
        )
      `)
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('last_used_at', { ascending: false })

    if (fetchError) throw fetchError

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('Default bank update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to set default bank account' 
    }), { status: 500 })
  }
})
