export const dynamic = 'force-dynamic';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/utils/rate-limit'
import { withAdmin } from '@/middleware/admin'

export const GET = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    // Build search query
    let dbQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    if (query) {
      dbQuery = dbQuery.textSearch('search_text', query)
    }

    if (role) {
      dbQuery = dbQuery.eq('role', role)
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status)
    }

    // Get paginated results
    const { data: users, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    // Log search
    await supabase.from('search_history').insert({
      user_id: user.id,
      query,
      type: 'users',
      results_count: count || 0
    })

    return NextResponse.json({
      users,
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('User search error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to search users' 
    }), { status: 500 })
  }
})
