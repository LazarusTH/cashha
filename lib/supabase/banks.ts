import { supabase } from './client'

export interface Bank {
  id: string
  name: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface CreateBankInput {
  name: string
  status?: Bank['status']
}

export async function createBank(data: CreateBankInput) {
  try {
    const { data: bank, error } = await supabase
      .from('banks')
      .insert([{
        ...data,
        status: data.status || 'active',
      }])
      .select()
      .single()

    if (error) throw error
    return bank
  } catch (error) {
    console.error('Error creating bank:', error)
    throw error
  }
}

export async function getActiveBanks() {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching active banks:', error)
    throw error
  }
}

export async function getAllBanks() {
  try {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching all banks:', error)
    throw error
  }
}

export async function updateBank(
  id: string,
  data: Partial<Omit<Bank, 'id' | 'created_at' | 'updated_at'>>
) {
  try {
    const { data: bank, error } = await supabase
      .from('banks')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return bank
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

export function subscribeToBanks(callback: (payload: any) => void) {
  return supabase
    .channel('custom-banks-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'banks',
      },
      callback
    )
    .subscribe()
}
