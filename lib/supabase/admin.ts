import { supabase } from './client'

export interface TransactionUpdate {
  id: string
  status: 'pending' | 'completed' | 'failed'
  adminNote?: string
}

export interface TransactionFilters {
  type?: 'deposit' | 'withdraw' | 'send'
  status?: 'pending' | 'completed' | 'failed'
  startDate?: Date
  endDate?: Date
}

export interface Transaction {
  id: string
  user_id: string
  type: 'deposit' | 'withdraw' | 'send'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  metadata?: {
    adminNote?: string
  }
  user?: {
    id: string
    email: string
    full_name: string
  }
  recipient?: {
    id: string
    email: string
    full_name: string
  }
}

export async function getAllTransactions(filters: TransactionFilters = {}) {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        user:profiles!user_id (
          id,
          email,
          full_name
        ),
        recipient:profiles!recipient_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }
}

export async function updateTransactionStatus(update: TransactionUpdate) {
  try {
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', update.id)
      .single()

    if (fetchError) throw fetchError

    // Update the transaction
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: update.status,
        metadata: {
          ...transaction.metadata,
          adminNote: update.adminNote,
        },
      })
      .eq('id', update.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating transaction:', error)
    throw error
  }
}

export async function getSystemStats() {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')

    if (error) throw error

    const stats = transactions.reduce(
      (acc, transaction) => {
        if (transaction.status === 'completed') {
          acc.totalTransactions += 1
          acc.totalVolume += transaction.amount

          switch (transaction.type) {
            case 'deposit':
              acc.totalDeposits += transaction.amount
              break
            case 'withdraw':
              acc.totalWithdrawals += transaction.amount
              break
            case 'send':
              acc.totalTransfers += transaction.amount
              break
          }
        }

        if (transaction.status === 'pending') {
          acc.pendingTransactions += 1
        }

        return acc
      },
      {
        totalTransactions: 0,
        totalVolume: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalTransfers: 0,
        pendingTransactions: 0,
      }
    )

    return stats
  } catch (error) {
    console.error('Error getting system stats:', error)
    throw error
  }
}

export async function getUserStats() {
  try {
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')

    if (usersError) throw usersError

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'completed')

    if (transactionsError) throw transactionsError

    return {
      totalUsers: users.length,
      activeUsers: new Set(transactions.map(t => t.user_id)).size,
      averageTransactionSize: transactions.length > 0
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
        : 0,
    }
  } catch (error) {
    console.error('Error getting user stats:', error)
    throw error
  }
}

// User Management
export async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'user') {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

// Bank Management
export interface Bank {
  id: string
  name: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface BankData {
  name: string
  status: Bank['status']
}

export async function getAllBanks() {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select(`
        *,
        accounts:bank_accounts (
          count
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching banks:', error)
    throw error
  }
}

export async function createBank(data: BankData) {
  try {
    const { error } = await supabase
      .from('banks')
      .insert([data])

    if (error) throw error
  } catch (error) {
    console.error('Error creating bank:', error)
    throw error
  }
}

export async function updateBank(id: string, data: BankData) {
  try {
    const { error } = await supabase
      .from('banks')
      .update(data)
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error updating bank:', error)
    throw error
  }
}

export async function deleteBank(id: string) {
  try {
    const { error } = await supabase
      .from('banks')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting bank:', error)
    throw error
  }
}

// Support Request Management
export interface SupportRequest {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  metadata?: {
    adminNote?: string
  }
  user?: {
    id: string
    email: string
    full_name: string
  }
}

export async function getAllSupportRequests() {
  try {
    const { data, error } = await supabase
      .from('support_requests')
      .select(`
        *,
        user:profiles!user_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching support requests:', error)
    throw error
  }
}

export async function updateSupportRequestStatus(
  requestId: string,
  status: 'open' | 'in_progress' | 'resolved',
  adminNote?: string
) {
  try {
    const { data, error } = await supabase
      .from('support_requests')
      .update({ 
        status,
        metadata: { adminNote }
      })
      .eq('id', requestId)
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Error updating support request:', error)
    throw error
  }
}

// Transaction Analytics
export async function getTransactionStats(days = 30) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

    if (error) throw error

    // Group transactions by date and type
    const stats = data.reduce((acc: any, transaction) => {
      const date = new Date(transaction.created_at).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = {
          date,
          deposits: 0,
          withdrawals: 0,
          transfers: 0,
          total: 0,
          success_rate: 0,
          failed: 0,
          completed: 0
        }
      }

      // Add amount to respective type
      if (transaction.type === 'deposit') acc[date].deposits += transaction.amount
      if (transaction.type === 'withdraw') acc[date].withdrawals += transaction.amount
      if (transaction.type === 'send') acc[date].transfers += transaction.amount

      // Track success/failure
      if (transaction.status === 'completed') acc[date].completed++
      if (transaction.status === 'failed') acc[date].failed++

      acc[date].total++
      acc[date].success_rate = (acc[date].completed / acc[date].total) * 100

      return acc
    }, {})

    return Object.values(stats)
  } catch (error) {
    console.error('Error getting transaction stats:', error)
    throw error
  }
}

export async function getTransactionMetrics() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')

    if (error) throw error

    const metrics = {
      total_volume: 0,
      success_rate: 0,
      average_amount: 0,
      by_type: {
        deposit: { count: 0, volume: 0 },
        withdraw: { count: 0, volume: 0 },
        send: { count: 0, volume: 0 }
      }
    }

    let completed = 0
    let total = 0

    data.forEach(transaction => {
      // Track total volume
      metrics.total_volume += transaction.amount

      // Track by type
      metrics.by_type[transaction.type].count++
      metrics.by_type[transaction.type].volume += transaction.amount

      // Track success rate
      if (transaction.status === 'completed') completed++
      total++
    })

    metrics.success_rate = (completed / total) * 100
    metrics.average_amount = metrics.total_volume / total

    return metrics
  } catch (error) {
    console.error('Error getting transaction metrics:', error)
    throw error
  }
}

export interface DashboardMetrics {
  totalUsers: number
  activeUsers: number
  totalTransactions: number
  totalVolume: number
  activeBanks: number
  openSupportRequests: number
  totalDeposits: number
  totalWithdrawals: number
  totalTransfers: number
  pendingTransactions: number
  averageTransactionSize: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Get all the data we need in parallel
    const [
      { data: users },
      { data: banks },
      { data: supportRequests },
      { data: transactions }
    ] = await Promise.all([
      supabase.from('profiles').select('id, last_active'),
      supabase.from('banks').select('id, status'),
      supabase.from('support_requests').select('id, status'),
      supabase.from('transactions').select('*')
    ])

    if (!users || !banks || !supportRequests || !transactions) {
      throw new Error('Failed to fetch dashboard metrics')
    }

    // Calculate active users (users who have made a transaction)
    const activeUserIds = new Set(transactions.map(t => t.user_id))

    // Calculate transaction stats
    const completedTransactions = transactions.filter(t => t.status === 'completed')
    const totalVolume = completedTransactions.reduce((sum, t) => sum + t.amount, 0)
    const averageTransactionSize = completedTransactions.length > 0
      ? totalVolume / completedTransactions.length
      : 0

    // Calculate transaction types
    const { deposits, withdrawals, transfers } = completedTransactions.reduce(
      (acc, t) => {
        switch (t.type) {
          case 'deposit':
            acc.deposits += t.amount
            break
          case 'withdraw':
            acc.withdrawals += t.amount
            break
          case 'send':
            acc.transfers += t.amount
            break
        }
        return acc
      },
      { deposits: 0, withdrawals: 0, transfers: 0 }
    )

    return {
      totalUsers: users.length,
      activeUsers: activeUserIds.size,
      totalTransactions: completedTransactions.length,
      totalVolume,
      activeBanks: banks.filter(b => b.status === 'active').length,
      openSupportRequests: supportRequests.filter(r => r.status === 'open').length,
      totalDeposits: deposits,
      totalWithdrawals: withdrawals,
      totalTransfers: transfers,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      averageTransactionSize
    }
  } catch (error) {
    console.error('Error getting dashboard metrics:', error)
    throw error
  }
}
