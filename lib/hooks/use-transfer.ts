'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/supabase/auth-context'
import { createTransfer, getUserTransferHistory, findUserByEmail } from '@/lib/supabase/transfer'
import { toast } from '@/components/ui/use-toast'

export function useTransfer() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [recipientSearchLoading, setRecipientSearchLoading] = useState(false)

  const submitTransfer = async (recipientEmail: string, amount: number, description?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send money",
        variant: "destructive",
      })
      return false
    }

    if (recipientEmail === user.email) {
      toast({
        title: "Error",
        description: "You cannot send money to yourself",
        variant: "destructive",
      })
      return false
    }

    setLoading(true)
    try {
      await createTransfer({
        senderId: user.id,
        recipientEmail,
        amount,
        description,
      })

      toast({
        title: "Success",
        description: "Money sent successfully",
      })

      // Refresh history
      fetchHistory()
      return true
    } catch (error: any) {
      console.error('Transfer error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to send money. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const searchRecipient = async (email: string) => {
    if (!email) return null

    setRecipientSearchLoading(true)
    try {
      const recipient = await findUserByEmail(email)
      return recipient
    } catch (error) {
      console.error('Recipient search error:', error)
      return null
    } finally {
      setRecipientSearchLoading(false)
    }
  }

  const fetchHistory = async () => {
    if (!user) return

    setHistoryLoading(true)
    try {
      const data = await getUserTransferHistory(user.id)
      setHistory(data)
    } catch (error) {
      console.error('Error fetching transfer history:', error)
      toast({
        title: "Error",
        description: "Failed to load transfer history",
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  return {
    submitTransfer,
    loading,
    history,
    historyLoading,
    fetchHistory,
    searchRecipient,
    recipientSearchLoading,
  }
}
