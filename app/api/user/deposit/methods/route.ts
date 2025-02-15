import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
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

    // Get active banks
    const { data: banks, error: banksError } = await supabase
      .from('banks')
      .select(`
        id,
        name,
        logo_url,
        account_number,
        account_name,
        branch,
        swift_code,
        minimum_deposit,
        maximum_deposit,
        processing_time,
        instructions
      `)
      .eq('is_active', true)
      .order('name')

    if (banksError) throw banksError

    // Get deposit methods configuration
    const { data: methods, error: methodsError } = await supabase
      .from('deposit_methods')
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
        required_fields
      `)
      .eq('is_active', true)
      .order('name')

    if (methodsError) throw methodsError

    // Get user's recent deposit methods
    const { data: recentMethods, error: recentError } = await supabase
      .from('deposits')
      .select('method')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    // Transform data
    const depositMethods = methods?.map(method => ({
      ...method,
      banks: method.name === 'bank_transfer' ? banks : [],
      is_recent: recentMethods?.some(recent => recent.method === method.name)
    }))

    return NextResponse.json({ 
      methods: depositMethods,
      banks 
    })
  } catch (error: any) {
    console.error('Deposit methods error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch deposit methods' 
    }), { status: 500 })
  }
})
