import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/middleware/admin-auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let query = supabase
      .from('transactions')
      .select(`
        *,
        recipient:profiles!transactions_recipient_id_fkey (
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('type', 'bulk_transfer')

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`recipient.full_name.ilike.%${search}%,recipient.email.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      meta: {
        total: count || 0,
        page,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching sending history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sending history' },
      { status: 500 }
    )
  }
})
