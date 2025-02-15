export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabase
      .from('email_receipts')
      .select('*, user:users(email)', { count: 'exact' })

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate)
    }

    const { data: receipts, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      receipts,
      total: count,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching email receipts:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch receipts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
