import { supabase } from './client'

export interface SupportRequest {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  updated_at: string
  user?: {
    email: string
    full_name: string
  }
}

export interface CreateSupportRequestInput {
  subject: string
  message: string
}

export async function createSupportRequest(userId: string, data: CreateSupportRequestInput) {
  try {
    const { data: request, error } = await supabase
      .from('support_requests')
      .insert([{
        user_id: userId,
        ...data,
      }])
      .select(`
        *,
        user:profiles!user_id (
          email,
          full_name
        )
      `)
      .single()

    if (error) throw error
    return request
  } catch (error) {
    console.error('Error creating support request:', error)
    throw error
  }
}

export async function getUserSupportRequests(userId: string) {
  try {
    const { data, error } = await supabase
      .from('support_requests')
      .select(`
        *,
        user:profiles!user_id (
          email,
          full_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching support requests:', error)
    throw error
  }
}

export async function getAllSupportRequests() {
  try {
    const { data, error } = await supabase
      .from('support_requests')
      .select(`
        *,
        user:profiles!user_id (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching all support requests:', error)
    throw error
  }
}

export async function updateSupportRequestStatus(id: string, status: SupportRequest['status']) {
  try {
    const { data, error } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        user:profiles!user_id (
          email,
          full_name
        )
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating support request status:', error)
    throw error
  }
}

export function subscribeSupportRequests(callback: (payload: any) => void) {
  return supabase
    .channel('custom-support-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_requests',
      },
      callback
    )
    .subscribe()
}

export function subscribeUserSupportRequests(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel('custom-user-support-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_requests',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}
