
export const dynamic = 'force-dynamic'

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
    const limit = parseInt(searchParams.get('limit') || '50')
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get audit logs with security-related actions
    let query = supabase
      .from('activity_logs')
      .select('*, user:profiles!user_id(*)', { count: 'exact' })
      .in('action', [
        'LOGIN_ATTEMPT',
        'PASSWORD_CHANGE',
        'ROLE_CHANGE',
        'PERMISSION_CHANGE',
        'SETTINGS_CHANGE',
        'SECURITY_ALERT'
      ])

    if (severity) {
      query = query.eq('details->severity', severity)
    }
    if (category) {
      query = query.eq('details->category', category)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Get paginated results
    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    // Group logs by category
    const groupedLogs = logs?.reduce((acc: any, log) => {
      const category = log.details?.category || 'other'
      acc[category] = acc[category] || []
      acc[category].push(log)
      return acc
    }, {})

    return NextResponse.json({
      logs: groupedLogs,
      summary: {
        total: count || 0,
        bySeverity: logs?.reduce((acc: any, log) => {
          const severity = log.details?.severity || 'info'
          acc[severity] = (acc[severity] || 0) + 1
          return acc
        }, {}),
        byCategory: logs?.reduce((acc: any, log) => {
          const category = log.details?.category || 'other'
          acc[category] = (acc[category] || 0) + 1
          return acc
        }, {})
      },
      page,
      limit
    })
  } catch (error: any) {
    console.error('Audit logs fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch audit logs' 
    }), { status: 500 })
  }
})
