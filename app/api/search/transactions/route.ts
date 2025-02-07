import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Build search query
    let dbQuery = supabase
      .from('transactions')
      .select('*, sender:profiles!sender_id(*), recipient:profiles!recipient_id(*)', { count: 'exact' })
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

    if (query) {
      dbQuery = dbQuery.textSearch('search_text', query)
    }

    if (startDate) {
      dbQuery = dbQuery.gte('created_at', startDate)
    }

    if (endDate) {
      dbQuery = dbQuery.lte('created_at', endDate)
    }

    if (type) {
      dbQuery = dbQuery.eq('type', type)
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status)
    }

    // Get paginated results
    const { data: transactions, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    // Log search
    await supabase.from('search_history').insert({
      user_id: user.id,
      query,
      type: 'transactions',
      results_count: count || 0
    })

    return NextResponse.json({
      transactions,
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('Transaction search error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to search transactions' 
    }), { status: 500 })
  }
}
