'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/use-toast'

export function useAdmin() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [metrics, setMetrics] = useState<any | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState(false)

  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  const [banks, setBanks] = useState<any[]>([])
  const [banksLoading, setBanksLoading] = useState(true)

  const [supportRequests, setSupportRequests] = useState<any[]>([])
  const [supportRequestsLoading, setSupportRequestsLoading] = useState(true)

  const [transactionStats, setTransactionStats] = useState<any>(null)
  const [transactionStatsLoading, setTransactionStatsLoading] = useState(true)

  const fetchTransactions = async (filters?: any) => {
    setTransactionsLoading(true)
    try {
      // Build query string from filters
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value)
        })
      }
      
      const response = await fetch(`/api/transactions?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      
      const data = await response.json()
      setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      })
    } finally {
      setTransactionsLoading(false)
    }
  }

  const updateTransaction = async (
    id: string,
    status: 'pending' | 'completed' | 'failed',
    adminNote?: string
  ) => {
    setUpdateLoading(true)
    try {
      await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          metadata: {
            adminNote
          }
        }),
      })
      
      toast({
        title: "Success",
        description: "Transaction status updated successfully",
      })

      // Refresh transactions and stats
      fetchTransactions()
      fetchMetrics()
      
      return true
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: "Error",
        description: "Failed to update transaction status",
        variant: "destructive",
      })
      return false
    } finally {
      setUpdateLoading(false)
    }
  }

  const fetchMetrics = async () => {
    setMetricsLoading(true)
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard metrics",
        variant: "destructive",
      })
    } finally {
      setMetricsLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setUsersLoading(false)
    }
  }

  const updateRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      await fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role
        }),
      })
      await fetchUsers() // Refresh users list
      toast({
        title: "Success",
        description: "User role updated successfully",
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    }
  }

  const fetchBanks = async () => {
    setBanksLoading(true)
    try {
      const response = await fetch('/api/banks')
      if (!response.ok) throw new Error('Failed to fetch banks')
      
      const data = await response.json()
      setBanks(data)
    } catch (error) {
      console.error('Error fetching banks:', error)
      toast({
        title: "Error",
        description: "Failed to load banks",
        variant: "destructive",
      })
    } finally {
      setBanksLoading(false)
    }
  }

  const fetchSupportRequests = async () => {
    setSupportRequestsLoading(true)
    try {
      const response = await fetch('/api/support')
      if (!response.ok) throw new Error('Failed to fetch support requests')
      
      const data = await response.json()
      setSupportRequests(data)
    } catch (error) {
      console.error('Error fetching support requests:', error)
      toast({
        title: "Error",
        description: "Failed to load support requests",
        variant: "destructive",
      })
    } finally {
      setSupportRequestsLoading(false)
    }
  }

  const updateSupportRequest = async (requestId: string, status: 'open' | 'in_progress' | 'resolved', adminNote?: string) => {
    try {
      await fetch('/api/support/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status,
          note: adminNote
        }),
      })
      await fetchSupportRequests() // Refresh support requests list
      toast({
        title: "Success",
        description: "Support request updated successfully",
      })
    } catch (error) {
      console.error('Error updating support request:', error)
      toast({
        title: "Error",
        description: "Failed to update support request",
        variant: "destructive",
      })
    }
  }

  const fetchTransactionStats = async (days = 30) => {
    setTransactionStatsLoading(true)
    try {
      const response = await fetch(`/api/admin/transactions/stats?days=${days}`)
      if (!response.ok) throw new Error('Failed to fetch transaction stats')
      
      const data = await response.json()
      setTransactionStats(data)
    } catch (error) {
      console.error('Error fetching transaction stats:', error)
      toast({
        title: "Error",
        description: "Failed to load transaction statistics",
        variant: "destructive",
      })
    } finally {
      setTransactionStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    fetchTransactions()
    fetchUsers()
    fetchBanks()
    fetchSupportRequests()
    fetchTransactionStats()
  }, [])

  return {
    transactions,
    transactionsLoading,
    metrics,
    metricsLoading,
    updateLoading,
    fetchTransactions,
    updateTransaction,
    fetchMetrics,
    users,
    usersLoading,
    fetchUsers,
    updateRole,
    banks,
    banksLoading,
    fetchBanks,
    supportRequests,
    supportRequestsLoading,
    fetchSupportRequests,
    updateSupportRequest,
    transactionStats,
    transactionStatsLoading,
    fetchTransactionStats,
  }
}
