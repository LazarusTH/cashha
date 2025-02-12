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
    const { startDate, endDate, type, status } = await req.json()

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        admin_id: user.id,
        type: 'transactions',
        parameters: { startDate, endDate, type, status },
        status: 'processing'
      })
      .select()
      .single()

    if (reportError) throw reportError

    // Get transactions data
    let query = supabase
      .from('transactions')
      .select(`
        *,
        sender:profiles!sender_id(email, full_name),
        recipient:profiles!recipient_id(email, full_name)
      `)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: transactions, error: txError } = await query
      .order('created_at', { ascending: false })

    if (txError) throw txError

    // Calculate statistics
    const stats = {
      totalCount: transactions?.length || 0,
      totalAmount: transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0,
      byType: transactions?.reduce((acc: any, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1
        return acc
      }, {}),
      byStatus: transactions?.reduce((acc: any, tx) => {
        acc[tx.status] = (acc[tx.status] || 0) + 1
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
      'GENERATE_TRANSACTION_REPORT',
      JSON.stringify({
        reportId: report.id,
        parameters: { startDate, endDate, type, status }
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
    console.error('Transaction report error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to generate transaction report' 
    }), { status: 500 })
  }
})
