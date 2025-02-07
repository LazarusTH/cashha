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
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        sender:profiles!sender_id(
          id,
          full_name,
          email
        ),
        recipient:profiles!recipient_id(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`
        sender.full_name.ilike.%${search}%,
        sender.email.ilike.%${search}%,
        recipient.full_name.ilike.%${search}%,
        recipient.email.ilike.%${search}%
      `)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Get paginated results
    const { data: transactions, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      transactions,
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('Transactions fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch transactions' 
    }), { status: 500 })
  }
})
