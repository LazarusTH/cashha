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

    // Build query
    let query = supabase
      .from('sending_requests')
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

    if (status) {
      query = query.eq('status', status)
    }

    // Get paginated results
    const { data: requests, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      requests,
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('Sending requests fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch sending requests' 
    }), { status: 500 })
  }
})
