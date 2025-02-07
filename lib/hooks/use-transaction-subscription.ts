'use client'

import { useEffect } from 'react'
import { subscribeToUserTransactions } from '@/lib/supabase/transactions'
import { useAuth } from '@/lib/supabase/auth-context'
import { toast } from '@/components/ui/use-toast'

export function useTransactionSubscription(onUpdate?: () => void) {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const subscription = subscribeToUserTransactions(user.id, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload

      let message = ''
      switch (eventType) {
        case 'INSERT':
          message = `New ${newRecord.type} transaction created`
          break
        case 'UPDATE':
          if (newRecord.status !== oldRecord.status) {
            message = `Transaction status updated to ${newRecord.status}`
          }
          break
        case 'DELETE':
          message = 'Transaction deleted'
          break
      }

      if (message) {
        toast({
          title: 'Transaction Update',
          description: message,
        })
      }

      // Call the callback if provided
      onUpdate?.()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [user, onUpdate])
}
