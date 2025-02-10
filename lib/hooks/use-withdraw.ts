'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/supabase/auth-context';
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();
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
      const response = await fetch('/api/user/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit withdrawal')
      }

      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
      })

      // Refresh history
      fetchHistory()
      return true
    } catch (error) {
      console.error('Withdrawal error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit withdrawal request",
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
      const response = await fetch('/api/user/withdrawals')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch withdrawal history')
      }

      const data = await response.json()
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
