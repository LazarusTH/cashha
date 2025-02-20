import { DatabaseTransaction } from './db-transaction'
import { supabase } from './client'
import { getUserBalance } from './transactions'

export interface TransferRequest {
  senderId: string
  recipientId?: string
  recipientEmail?: string
  amount: number
  description?: string
}

export async function findUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .single()

  if (error) throw error
  return data
}

export async function createTransfer(data: TransferRequest) {
  const transaction = new DatabaseTransaction()
  
  try {
    // Check sender's balance
    const senderBalance = await getUserBalance(data.senderId)
    if (senderBalance < data.amount) {
      throw new Error('Insufficient balance')
    }

    // Resolve recipient
    let recipientId = data.recipientId
    if (data.recipientEmail) {
      const recipient = await findUserByEmail(data.recipientEmail)
      if (!recipient) {
        throw new Error('Recipient not found')
      }
      recipientId = recipient.id
    }

    if (!recipientId) {
      throw new Error('Recipient not specified')
    }

    // Define transaction operations
    const operations = [
      // Deduct from sender
      {
        table: 'balances',
        type: 'update',
        data: { 
          amount: senderBalance - data.amount 
        },
        condition: { user_id: data.senderId }
      },
      // Add to recipient
      {
        table: 'balances',
        type: 'update',
        data: { 
          amount: supabase.raw(`amount + ${data.amount}`) 
        },
        condition: { user_id: recipientId }
      },
      // Create transaction record
      {
        table: 'transactions',
        type: 'insert',
        data: {
          user_id: data.senderId,
          recipient_id: recipientId,
          type: 'send',
          amount: data.amount,
          status: 'completed',
          description: data.description
        }
      }
    ]

    // Execute transaction with rollback support
    const { success, error } = await transaction.execute(operations)
    
    if (!success) {
      throw new Error(error || 'Transfer failed')
    }

    return { success: true }
  } catch (error) {
    throw error
  }
}

export async function getUserTransferHistory(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      recipient:profiles!recipient_id (
        id,
        email,
        full_name
      )
    `)
    .eq('user_id', userId)
    .eq('type', 'send')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
