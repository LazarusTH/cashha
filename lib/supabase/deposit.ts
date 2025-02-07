import { supabase } from './client'
import { getUserBalance } from './transactions'

export interface DepositRequest {
  userId: string
  amount: number
  fullName: string
  status?: 'pending' | 'completed' | 'failed'
}

export async function createDepositRequest(data: DepositRequest) {
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: data.userId,
        type: 'deposit',
        amount: data.amount,
        status: data.status || 'pending',
        description: `Deposit request from ${data.fullName}`,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return transaction
}

export async function getUserDepositHistory(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'deposit')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getDepositRequest(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .eq('type', 'deposit')
    .single()

  if (error) throw error
  return data
}
