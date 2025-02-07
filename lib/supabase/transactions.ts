import { supabase } from './client'

export type TransactionType = 'deposit' | 'withdraw' | 'send'
export type TransactionStatus = 'pending' | 'completed' | 'failed'

export interface TransactionMetadata {
  method?: string
  bank_name?: string
  account_number?: string
  reference?: string
  adminNote?: string
  reason?: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  status: TransactionStatus
  recipient_id?: string
  description?: string
  metadata?: TransactionMetadata
  created_at: string
}

export interface CreateTransactionInput extends Omit<Transaction, 'id' | 'created_at' | 'status'> {
  status?: TransactionStatus
}

export async function createTransaction(data: CreateTransactionInput) {
  try {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert([{
        ...data,
        status: data.status || 'pending',
      }])
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
      .single()

    if (error) throw error
    return transaction
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw error
  }
}

export async function getUserTransactions(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
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
      .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user transactions:', error)
    throw error
  }
}

export async function getTransactionById(id: string) {
  try {
    const { data, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching transaction:', error)
    throw error
  }
}

export async function getUserBalance(userId: string) {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('status', 'completed')

    if (error) throw error

    return transactions.reduce((balance, transaction) => {
      if (transaction.status !== 'completed') return balance

      if (transaction.type === 'deposit' && transaction.user_id === userId) {
        return balance + transaction.amount
      }
      if (transaction.type === 'withdraw' && transaction.user_id === userId) {
        return balance - transaction.amount
      }
      if (transaction.type === 'send') {
        if (transaction.user_id === userId) {
          return balance - transaction.amount
        }
        if (transaction.recipient_id === userId) {
          return balance + transaction.amount
        }
      }
      return balance
    }, 0)
  } catch (error) {
    console.error('Error calculating user balance:', error)
    throw error
  }
}

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus,
  metadata?: Partial<TransactionMetadata>
) {
  try {
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('metadata')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { data, error } = await supabase
      .from('transactions')
      .update({
        status,
        metadata: {
          ...existingTransaction.metadata,
          ...metadata,
        },
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating transaction status:', error)
    throw error
  }
}

// Real-time subscription helper
export function subscribeToUserTransactions(
  userId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel('custom-all-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}
