import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    // Get bulk transfers
    const { data: transfers, error, count } = await supabase
      .from('transactions')
      .select('*, recipient:profiles(email, full_name)', { count: 'exact' })
      .eq('type', 'admin_transfer')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      transfers,
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('History fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch transfer history' 
    }), { status: 500 })
  }
})
