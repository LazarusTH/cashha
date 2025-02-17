export const dynamic = 'force-dynamic';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server';
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || 'week' // week, month, year
    const type = searchParams.get('type') || 'all' // all, deposits, withdrawals, transfers

    // Calculate date range based on timeframe
    const endDate = new Date()
    const startDate = new Date()
    switch (timeframe) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(startDate.getDate() - 7)
    }

    // Get transaction data
    let transactionQuery = supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (type !== 'all') {
      transactionQuery = transactionQuery.eq('type', type)
    }

    const { data: transactions, error: transactionError } = await transactionQuery

    if (transactionError) {
      console.error('Transactions fetch error:', transactionError)
      return NextResponse.json(
        { error: 'Failed to fetch transaction data' },
        { status: 500 }
      )
    }

    // Get user growth data
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (userError) {
      console.error('Users fetch error:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Get bank performance data
    const { data: banks, error: bankError } = await supabase
      .from('banks')
      .select(`
        id,
        name,
        transactions:transactions(amount, type, status),
        withdrawals:withdrawal_requests(amount, status),
        deposits:deposit_requests(amount, status)
      `)

    if (bankError) {
      console.error('Banks fetch error:', bankError)
      return NextResponse.json(
        { error: 'Failed to fetch bank data' },
        { status: 500 }
      )
    }

    // Calculate transaction metrics
    const transactionMetrics = transactions?.reduce((acc: any, tx) => {
      if (tx.status === 'completed') {
        acc.total_volume += tx.amount
        acc[tx.type] = (acc[tx.type] || 0) + tx.amount
        acc.count += 1
      }
      return acc
    }, { total_volume: 0, count: 0 })

    // Calculate user metrics
    const userMetrics = {
      total: users?.length || 0,
      active: users?.filter(u => u.status === 'active').length || 0,
      pending: users?.filter(u => u.status === 'pending').length || 0
    }

    // Calculate bank metrics
    const bankMetrics = banks?.map(bank => ({
      id: bank.id,
      name: bank.name,
      transaction_volume: bank.transactions?.reduce((sum: number, tx: any) => 
        tx.status === 'completed' ? sum + (tx.amount || 0) : sum, 0) || 0,
      withdrawal_volume: bank.withdrawals?.reduce((sum: number, w: any) => 
        w.status === 'completed' ? sum + (w.amount || 0) : sum, 0) || 0,
      deposit_volume: bank.deposits?.reduce((sum: number, d: any) => 
        d.status === 'completed' ? sum + (d.amount || 0) : sum, 0) || 0
    }))

    // Group data by date for charts
    const dateGroups = transactions?.reduce((acc: any, tx) => {
      const date = new Date(tx.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { date, volume: 0, count: 0 }
      }
      if (tx.status === 'completed') {
        acc[date].volume += tx.amount
        acc[date].count += 1
      }
      return acc
    }, {})

    return NextResponse.json({
      transactions: {
        ...transactionMetrics,
        chart_data: Object.values(dateGroups || {})
      },
      users: userMetrics,
      banks: bankMetrics,
      timeframe,
      type
    })

  } catch (error: any) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
