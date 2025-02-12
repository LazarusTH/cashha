import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logAdminAction } from '@/lib/utils/audit-logger'

export const POST = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { startDate, endDate, role, status } = await req.json()

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        admin_id: user.id,
        type: 'users',
        parameters: { startDate, endDate, role, status },
        status: 'processing'
      })
      .select()
      .single()

    if (reportError) throw reportError

    // Get users data
    let query = supabase
      .from('profiles')
      .select('*, transactions(*)')

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (role) {
      query = query.eq('role', role)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: users, error: usersError } = await query

    if (usersError) throw usersError

    // Calculate statistics
    const stats = {
      totalUsers: users?.length || 0,
      byRole: users?.reduce((acc: any, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {}),
      byStatus: users?.reduce((acc: any, user) => {
        acc[user.status] = (acc[user.status] || 0) + 1
        return acc
      }, {}),
      transactionStats: users?.reduce((acc: any, user) => {
        const userTx = user.transactions || []
        acc.totalTransactions = (acc.totalTransactions || 0) + userTx.length
        acc.totalVolume = (acc.totalVolume || 0) + userTx.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)
        return acc
      }, {})
    }

    // Update report with results
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'completed',
        parameters: {
          ...report.parameters,
          stats
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', report.id)

    if (updateError) throw updateError

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      report.id,  // target is the report
      'GENERATE_USER_REPORT',
      JSON.stringify({
        reportId: report.id,
        parameters: { startDate, endDate, role, status }
      }),
      req.headers
    )

    return NextResponse.json({
      report: {
        ...report,
        stats
      }
    })
  } catch (error: any) {
    console.error('User report error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to generate user report' 
    }), { status: 500 })
  }
})
