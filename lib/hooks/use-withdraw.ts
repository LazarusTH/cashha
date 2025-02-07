'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/supabase/auth-context'
import { createWithdrawRequest, getUserWithdrawHistory } from '@/lib/supabase/withdraw'
import { toast } from '@/components/ui/use-toast'

export interface WithdrawFormData {
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
  description?: string
}

export function useWithdraw() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const submitWithdrawal = async (data: WithdrawFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to withdraw money",
        variant: "destructive",
      })
      return false
    }

    setLoading(true)
    try {
      await createWithdrawRequest({
        userId: user.id,
        amount: data.amount,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        description: data.description,
      })

      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
      })

      // Refresh history
      fetchHistory()
      return true
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit withdrawal request. Please try again.",
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
      const data = await getUserWithdrawHistory(user.id)
      setHistory(data)
    } catch (error) {
      console.error('Error fetching withdrawal history:', error)
      toast({
        title: "Error",
        description: "Failed to load withdrawal history",
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  return {
    submitWithdrawal,
    loading,
    history,
    historyLoading,
    fetchHistory,
  }
}
