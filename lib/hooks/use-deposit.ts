'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/supabase/auth-context'
import { useToast } from '@/components/ui/use-toast';

interface Transaction {
  id: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  payment_method: string
  description?: string
}

export interface DepositFormData {
    amount: number
    paymentMethod: string
    description?: string
}

export function useDeposit() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Transaction[]>([])
  const { toast } = useToast()
  const [historyLoading, setHistoryLoading] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  useEffect(() => {
    // Cleanup function to abort any pending requests
    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [abortController])

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
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('/api/user/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
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
      await fetchHistory()
      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, do nothing
        return false
      }
      console.error('Deposit error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit deposit request",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  const fetchHistory = async () => {
    if (!user) return

    setHistoryLoading(true)
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('/api/user/deposits', {
        signal: controller.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch deposit history')
      }

      const data = await response.json()
      setHistory(data)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, do nothing
        return
      }
      console.error('Error fetching deposit history:', error)
      toast({
        title: "Error",
        description: "Failed to load deposit history",
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
      setAbortController(null)
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

