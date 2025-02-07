'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/supabase/auth-context'
import { createDepositRequest, getUserDepositHistory } from '@/lib/supabase/deposit'
import { toast } from '@/components/ui/use-toast'

export function useDeposit() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const submitDeposit = async (amount: number, fullName: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to make a deposit",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await createDepositRequest({
        userId: user.id,
        amount,
        fullName,
      })

      toast({
        title: "Success",
        description: "Deposit request submitted successfully",
      })

      // Refresh history
      fetchHistory()
      
      return true
    } catch (error) {
      console.error('Deposit error:', error)
      toast({
        title: "Error",
        description: "Failed to submit deposit request. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    if (!user) return

    setHistoryLoading(true)
    try {
      const data = await getUserDepositHistory(user.id)
      setHistory(data)
    } catch (error) {
      console.error('Error fetching deposit history:', error)
      toast({
        title: "Error",
        description: "Failed to load deposit history",
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  return {
    submitDeposit,
    loading,
    history,
    historyLoading,
    fetchHistory,
  }
}
