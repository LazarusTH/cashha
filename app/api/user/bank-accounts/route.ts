import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user's bank accounts
    const { data: accounts, error } = await supabase
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

    if (error) throw error

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('Bank accounts fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch bank accounts' 
    }), { status: 500 })
  }
})

export const POST = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { bank_id, account_number, account_name } = await req.json()

    // Validate bank
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id')
      .eq('id', bank_id)
      .single()

    if (bankError || !bank) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid bank selected' 
      }), { status: 400 })
    }

    // Check if account already exists
    const { data: existing, error: existingError } = await supabase
      .from('user_bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('bank_id', bank_id)
      .eq('account_number', account_number)
      .single()

    if (existing) {
      return new NextResponse(JSON.stringify({ 
        error: 'This bank account is already added to your profile' 
      }), { status: 400 })
    }

    // Check account limit
    const { data: accountCount, error: countError } = await supabase
      .from('user_bank_accounts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if (countError) throw countError

    const maxAccounts = 5 // Can be moved to user settings or verification level
    if (accountCount && accountCount.length >= maxAccounts) {
      return new NextResponse(JSON.stringify({ 
        error: `You can only add up to ${maxAccounts} bank accounts` 
      }), { status: 400 })
    }

    // Create bank account
    const { data: account, error } = await supabase
      .from('user_bank_accounts')
      .insert({
        user_id: user.id,
        bank_id,
        account_number,
        account_name,
        is_default: accountCount?.length === 0, // Make first account default
        verification_status: 'pending'
      })
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

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error('Bank account creation error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to add bank account' 
    }), { status: 500 })
  }
})
