import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        user:profiles(
          id,
          email,
          full_name,
          balance
        ),
        bank:bank_accounts(
          id,
          bank_name,
          account_number,
          account_holder_name
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`user.email.ilike.%${search}%,user.full_name.ilike.%${search}%,bank.account_number.ilike.%${search}%`)
    }

    // Get paginated results
    const { data: withdrawals, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      withdrawals,
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('Withdrawals fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch withdrawals' 
    }), { status: 500 })
  }
})
