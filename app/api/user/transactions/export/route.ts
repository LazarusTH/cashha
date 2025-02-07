import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        sender:profiles!sender_id(
          email,
          full_name
        ),
        recipient:profiles!recipient_id(
          email,
          full_name
        ),
        bank:banks(
          name,
          code
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (type) {
      query = query.eq('type', type)
    }

    // Get transactions
    const { data: transactions, error } = await query

    if (error) throw error

    // Format data based on export type
    let exportData: string
    if (format === 'csv') {
      // CSV format
      const headers = [
        'Date',
        'Reference',
        'Type',
        'Amount',
        'Status',
        'Sender',
        'Recipient',
        'Bank',
        'Description'
      ].join(',')

      const rows = transactions.map(t => [
        new Date(t.created_at).toISOString(),
        t.reference,
        t.type,
        t.amount,
        t.status,
        t.sender?.full_name || '',
        t.recipient?.full_name || '',
        t.bank?.name || '',
        t.description || ''
      ].join(','))

      exportData = [headers, ...rows].join('\\n')
    } else {
      // JSON format
      exportData = JSON.stringify(transactions, null, 2)
    }

    // Log activity
    await supabase.from('user_activities').insert({
      user_id: user.id,
      type: 'transactions_export',
      description: `Exported transactions in ${format.toUpperCase()} format`
    })

    // Set appropriate headers for download
    const headers = new Headers()
    headers.set('Content-Type', format === 'csv' ? 'text/csv' : 'application/json')
    headers.set('Content-Disposition', `attachment; filename=transactions.${format}`)

    return new NextResponse(exportData, { headers })
  } catch (error: any) {
    console.error('Transactions export error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to export transactions' 
    }), { status: 500 })
  }
})
