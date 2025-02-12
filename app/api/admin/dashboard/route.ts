import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get dashboard metrics
    const [
      usersResult,
      transactionsResult,
      walletsResult,
      supportResult,
      withdrawalsResult,
      depositsResult
    ] = await Promise.all([
      // Get users count and stats
      supabase
        .from('profiles')
        .select('*', { count: 'exact' }),

      // Get recent transactions
      supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),

      // Get total wallet balance
      supabase
        .from('wallets')
        .select('balance'),

      // Get pending support tickets
      supabase
        .from('support_tickets')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5),

      // Get pending withdrawals
      supabase
        .from('withdrawals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),

      // Get recent deposits
      supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // Calculate total balance
    const totalBalance = walletsResult.data?.reduce((sum: number, wallet: { balance: number }) => 
      sum + (wallet.balance || 0), 0) || 0

    // Get transaction stats for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: transactionStats } = await supabase
      .from('transactions')
      .select('amount, type, status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Calculate transaction metrics
    const stats = transactionStats?.reduce((acc: any, tx: { 
      status: string;
      amount: number;
      type: string;
    }) => {
      if (tx.status === 'completed') {
        acc.total_volume += tx.amount
        acc[tx.type] = (acc[tx.type] || 0) + tx.amount
      }
      return acc
    }, { total_volume: 0 }) || { total_volume: 0 }

    return NextResponse.json({
      metrics: {
        total_users: usersResult.count || 0,
        total_balance: totalBalance,
        transaction_volume: stats.total_volume,
        pending_withdrawals: withdrawalsResult.data?.length || 0,
        open_tickets: supportResult.data?.length || 0
      },
      recent: {
        transactions: transactionsResult.data || [],
        support_tickets: supportResult.data || [],
        withdrawals: withdrawalsResult.data || [],
        deposits: depositsResult.data || []
      },
      transaction_stats: {
        volume: stats.total_volume,
        withdrawal: stats.withdrawal || 0,
        deposit: stats.deposit || 0,
        transfer: stats.transfer || 0
      }
    })

  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { type, id, action, data } = await request.json()

    if (!type || !id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'transaction':
        result = await handleTransactionUpdate(supabase, id, action, data)
        break
      case 'withdrawal':
        result = await handleWithdrawalUpdate(supabase, id, action, data)
        break
      case 'support':
        result = await handleSupportUpdate(supabase, id, action, data)
        break
      case 'user':
        result = await handleUserUpdate(supabase, id, action, data)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid update type' },
          { status: 400 }
        )
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      type: `admin_${type}_${action}`,
      metadata: {
        id,
        action,
        data,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json(result.data)

  } catch (error) {
    console.error('Dashboard update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleTransactionUpdate(supabase: any, id: string, action: string, data: any) {
  if (action !== 'update_status') {
    return { error: 'Invalid action for transaction', status: 400 }
  }

  if (!data.status || !['completed', 'failed', 'cancelled'].includes(data.status)) {
    return { error: 'Invalid status', status: 400 }
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .update({
      status: data.status,
      admin_note: data.note,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Transaction update error:', error)
    return { error: 'Failed to update transaction', status: 500 }
  }

  return { data: transaction }
}

async function handleWithdrawalUpdate(supabase: any, id: string, action: string, data: any) {
  if (!['approve', 'reject'].includes(action)) {
    return { error: 'Invalid action for withdrawal', status: 400 }
  }

  const status = action === 'approve' ? 'approved' : 'rejected'

  const { data: withdrawal, error } = await supabase
    .from('withdrawals')
    .update({
      status,
      admin_note: data.note,
      processed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Withdrawal update error:', error)
    return { error: 'Failed to update withdrawal', status: 500 }
  }

  return { data: withdrawal }
}

async function handleSupportUpdate(supabase: any, id: string, action: string, data: any) {
  if (action !== 'update_status') {
    return { error: 'Invalid action for support ticket', status: 400 }
  }

  if (!data.status || !['open', 'in_progress', 'resolved', 'closed'].includes(data.status)) {
    return { error: 'Invalid status', status: 400 }
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .update({
      status: data.status,
      admin_note: data.note,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Support ticket update error:', error)
    return { error: 'Failed to update support ticket', status: 500 }
  }

  return { data: ticket }
}

async function handleUserUpdate(supabase: any, id: string, action: string, data: any) {
  if (!['update_role', 'update_status', 'update_limits'].includes(action)) {
    return { error: 'Invalid action for user', status: 400 }
  }

  const updates: any = {
    updated_at: new Date().toISOString()
  }

  switch (action) {
    case 'update_role':
      if (!data.role || !['user', 'admin'].includes(data.role)) {
        return { error: 'Invalid role', status: 400 }
      }
      updates.role = data.role
      break

    case 'update_status':
      if (!data.status || !['active', 'suspended', 'blocked'].includes(data.status)) {
        return { error: 'Invalid status', status: 400 }
      }
      updates.status = data.status
      break

    case 'update_limits':
      if ((data.send_limit !== undefined && data.send_limit < 0) ||
          (data.withdraw_limit !== undefined && data.withdraw_limit < 0)) {
        return { error: 'Invalid limits', status: 400 }
      }
      updates.send_limit = data.send_limit
      updates.withdraw_limit = data.withdraw_limit
      break
  }

  const { data: user, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('User update error:', error)
    return { error: 'Failed to update user', status: 500 }
  }

  return { data: user }
}
