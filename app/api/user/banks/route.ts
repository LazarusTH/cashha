export const dynamic = 'force-dynamic';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user's bank accounts
    const { data: accounts, error } = await supabase
      .from('user_banks')
      .select(`
        *,
        bank:banks(
          id,
          name,
          code,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })

    if (error) throw error

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('Bank accounts fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch bank accounts' 
    }), { status: 500 })
  }
})

export const POST = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { bankId, accountNumber, accountName } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Validate bank exists
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id')
      .eq('id', bankId)
      .single()

    if (bankError || !bank) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid bank selected' 
      }), { status: 400 })
    }

    // Check if account number already exists
    const { data: existing, error: existingError } = await supabase
      .from('user_banks')
      .select('id')
      .eq('bank_id', bankId)
      .eq('account_number', accountNumber)
      .single()

    if (existing) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bank account already exists' 
      }), { status: 400 })
    }

    // Get count of user's bank accounts
    const { count, error: countError } = await supabase
      .from('user_banks')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if (countError) throw countError

    // Create bank account
    const { data: account, error } = await supabase
      .from('user_banks')
      .insert({
        user_id: user.id,
        bank_id: bankId,
        account_number: accountNumber,
        account_name: accountName,
        is_default: count === 0 // First account is default
      })
      .select(`
        *,
        bank:banks(
          id,
          name,
          code,
          logo_url
        )
      `)
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'bank_account_added',
      description: `Added bank account: ${accountNumber} (${bank.name})`
    })

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error('Bank account creation error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to add bank account' 
    }), { status: 500 })
  }
})
