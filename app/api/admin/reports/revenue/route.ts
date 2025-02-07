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
    const { startDate, endDate, groupBy } = await req.json()

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        admin_id: user.id,
        type: 'revenue',
        parameters: { startDate, endDate, groupBy },
        status: 'processing'
      })
      .select()
      .single()

    if (reportError) throw reportError

    // Get transactions data
    let query = supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const { data: transactions, error: txError } = await query

    if (txError) throw txError

    // Calculate revenue statistics
    const stats = {
      totalRevenue: transactions?.reduce((sum, tx) => sum + (tx.fee || 0), 0) || 0,
      totalTransactions: transactions?.length || 0,
      averageFee: transactions?.reduce((sum, tx) => sum + (tx.fee || 0), 0) / (transactions?.length || 1),
      byPeriod: transactions?.reduce((acc: any, tx) => {
        const period = groupBy === 'month' 
          ? new Date(tx.created_at).toISOString().slice(0, 7)
          : new Date(tx.created_at).toISOString().slice(0, 10)
        
        acc[period] = acc[period] || { revenue: 0, count: 0 }
        acc[period].revenue += tx.fee || 0
        acc[period].count += 1
        return acc
      }, {}),
      byType: transactions?.reduce((acc: any, tx) => {
        acc[tx.type] = acc[tx.type] || { revenue: 0, count: 0 }
        acc[tx.type].revenue += tx.fee || 0
        acc[tx.type].count += 1
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
    await logAdminAction(user.id, 'GENERATE_REVENUE_REPORT', {
      reportId: report.id,
      parameters: { startDate, endDate, groupBy }
    })

    return NextResponse.json({
      report: {
        ...report,
        stats
      }
    })
  } catch (error: any) {
    console.error('Revenue report error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to generate revenue report' 
    }), { status: 500 })
  }
})
