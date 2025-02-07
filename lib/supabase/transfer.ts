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
  // Start by checking sender's balance
  const senderBalance = await getUserBalance(data.senderId)
  if (senderBalance < data.amount) {
    throw new Error('Insufficient balance')
  }

  // If recipient email is provided, find the recipient
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

  // Create the transfer transaction
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: data.senderId,
        recipient_id: recipientId,
        type: 'send',
        amount: data.amount,
        status: 'completed',
        description: data.description || 'Money transfer',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return transaction
}

export async function getUserTransferHistory(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      recipient:profiles!recipient_id (
        email,
        full_name
      ),
      sender:profiles!user_id (
        email,
        full_name
      )
    `)
    .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq('type', 'send')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
