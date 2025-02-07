import { supabase } from './client'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'transaction' | 'system' | 'support'
  read: boolean
  created_at: string
  updated_at: string
}

export async function getUserNotifications(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return count
  } catch (error) {
    console.error('Error fetching unread notification count:', error)
    throw error
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

export function subscribeToNotifications(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel('custom-notification-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}
