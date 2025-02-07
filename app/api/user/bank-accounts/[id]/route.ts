import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
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

    const { account_name } = await req.json()

    // Update bank account
    const { data: updated, error } = await supabase
      .from('user_bank_accounts')
      .update({ account_name })
      .eq('id', params.id)
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
      .single()

    if (error) throw error

    return NextResponse.json({ account: updated })
  } catch (error: any) {
    console.error('Bank account update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update bank account' 
    }), { status: 500 })
  }
})

export const DELETE = withAuth(async (req: Request, { params }: { params: { id: string } }) => {
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
      .select('id, user_id, is_default')
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

    // Check if it's the last account
    const { data: accountCount, error: countError } = await supabase
      .from('user_bank_accounts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if (countError) throw countError

    if (accountCount?.length === 1) {
      return new NextResponse(JSON.stringify({ 
        error: 'You must have at least one bank account' 
      }), { status: 400 })
    }

    // If deleting default account, make another one default
    if (account.is_default) {
      const { error: defaultError } = await supabase
        .from('user_bank_accounts')
        .update({ is_default: true })
        .eq('user_id', user.id)
        .neq('id', params.id)
        .limit(1)

      if (defaultError) throw defaultError
    }

    // Delete bank account
    const { error } = await supabase
      .from('user_bank_accounts')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Bank account deletion error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to delete bank account' 
    }), { status: 500 })
  }
})
