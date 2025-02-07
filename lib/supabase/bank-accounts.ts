import { supabase } from './client'

export interface BankAccount {
  id: string
  user_id: string
  bank_id: string
  account_number: string
  account_name: string
  is_default: boolean
  created_at: string
  updated_at: string
  bank?: {
    id: string
    name: string
    status: string
  }
}

export interface CreateBankAccountInput {
  bank_id: string
  account_number: string
  account_name: string
  is_default?: boolean
}

export async function createBankAccount(userId: string, data: CreateBankAccountInput) {
  try {
    const { data: bankAccount, error } = await supabase
      .from('bank_accounts')
      .insert([{
        user_id: userId,
        ...data,
      }])
      .select(`
        *,
        bank:banks (
          id,
          name,
          status
        )
      `)
      .single()

    if (error) throw error
    return bankAccount
  } catch (error) {
    console.error('Error creating bank account:', error)
    throw error
  }
}

export async function getUserBankAccounts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select(`
        *,
        bank:banks (
          id,
          name,
          status
        )
      `)
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    throw error
  }
}

export async function getDefaultBankAccount(userId: string) {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select(`
        *,
        bank:banks (
          id,
          name,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
    return data
  } catch (error) {
    console.error('Error fetching default bank account:', error)
    throw error
  }
}

export async function updateBankAccount(
  id: string,
  data: Partial<Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  try {
    const { data: bankAccount, error } = await supabase
      .from('bank_accounts')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        bank:banks (
          id,
          name,
          status
        )
      `)
      .single()

    if (error) throw error
    return bankAccount
  } catch (error) {
    console.error('Error updating bank account:', error)
    throw error
  }
}

export async function deleteBankAccount(id: string) {
  try {
    const { error } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting bank account:', error)
    throw error
  }
}

export async function setDefaultBankAccount(userId: string, id: string) {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error setting default bank account:', error)
    throw error
  }
}
