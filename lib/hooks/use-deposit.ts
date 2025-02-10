'use client'

'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/supabase/auth-context'
import { useToast } from '@/components/ui/use-toast';

export interface DepositFormData {
    amount: number
    paymentMethod: string
    description?: string
}

export function useDeposit() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const { toast } = useToast()
  const [historyLoading, setHistoryLoading] = useState(true)

  const submitDeposit = async (data: DepositFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to make a deposit",
        variant: "destructive",
      })
      return false
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit deposit')
      }

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
        description: error instanceof Error ? error.message : "Failed to submit deposit request",
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
      const response = await fetch('/api/user/deposits')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch deposit history')
      }

      const data = await response.json()
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

