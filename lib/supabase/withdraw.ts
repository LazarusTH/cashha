import { supabase } from './client'
import { getUserBalance } from './transactions'

export interface WithdrawRequest {
  userId: string
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
  description?: string
  status?: 'pending' | 'completed' | 'failed'
}

export async function createWithdrawRequest(data: WithdrawRequest) {
  // Check user's balance first
  const balance = await getUserBalance(data.userId)
  if (balance < data.amount) {
    throw new Error('Insufficient balance')
  }

  // Create the withdrawal transaction
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: data.userId,
        type: 'withdraw',
        amount: data.amount,
        status: data.status || 'pending',
        description: data.description || 'Withdrawal request',
        metadata: {
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
        },
      },
    ])
    .select()
    .single()

  if (error) throw error
  return transaction
}

export async function getUserWithdrawHistory(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'withdraw')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getWithdrawRequest(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .eq('type', 'withdraw')
    .single()

  if (error) throw error
  return data
}
