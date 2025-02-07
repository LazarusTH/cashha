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

    // Get user's verification status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_level, verification_status')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Get active banks
    const { data: banks, error: banksError } = await supabase
      .from('banks')
      .select(`
        id,
        name,
        logo_url,
        swift_code,
        minimum_withdrawal,
        maximum_withdrawal,
        processing_time,
        instructions,
        supported_currencies
      `)
      .eq('is_active', true)
      .order('name')

    if (banksError) throw banksError

    // Get withdrawal methods configuration
    const { data: methods, error: methodsError } = await supabase
      .from('withdrawal_methods')
      .select(`
        id,
        name,
        description,
        logo_url,
        minimum_amount,
        maximum_amount,
        fee_type,
        fee_amount,
        fee_percentage,
        processing_time,
        instructions,
        is_active,
        supported_currencies,
        required_fields,
        verification_level_required
      `)
      .eq('is_active', true)
      .order('name')

    if (methodsError) throw methodsError

    // Get user's saved bank accounts
    const { data: savedAccounts, error: accountsError } = await supabase
      .from('user_bank_accounts')
      .select(`
        id,
        bank_id,
        account_number,
        account_name,
        is_default,
        last_used_at,
        banks (
          name,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false })

    if (accountsError) throw accountsError

    // Get user's recent withdrawals
    const { data: recentWithdrawals, error: recentError } = await supabase
      .from('withdrawals')
      .select(`
        bank_id,
        account_number,
        account_name,
        amount,
        created_at,
        banks (
          name,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    // Filter methods based on verification level
    const availableMethods = methods?.filter(
      method => method.verification_level_required <= profile.verification_level
    )

    return NextResponse.json({
      methods: availableMethods,
      banks,
      saved_accounts: savedAccounts,
      recent_withdrawals: recentWithdrawals,
      verification: {
        level: profile.verification_level,
        status: profile.verification_status
      }
    })
  } catch (error: any) {
    console.error('Withdrawal methods error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch withdrawal methods' 
    }), { status: 500 })
  }
})
