'use client'

import { useState, useEffect } from 'react'
import { getUserTransactions, getUserBalance, Transaction } from '@/lib/supabase/transactions'
import { useAuth } from '@/lib/supabase/auth-context'

export interface DashboardData {
  currentBalance: number
  totalSent: number
  totalReceived: number
  totalWithdrawn: number
  recentTransactions: Transaction[]
  monthlyStats: Array<{
    name: string
    sent: number
    received: number
    withdrawn: number
  }>
}

export function useDashboardData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      try {
        const [balance, transactions] = await Promise.all([
          getUserBalance(user.id),
          getUserTransactions(user.id, 100) // Get more transactions for stats
        ])

        // Calculate totals
        const totals = transactions.reduce(
          (acc, transaction) => {
            if (transaction.status !== 'completed') return acc

            if (transaction.type === 'send') {
              if (transaction.user_id === user.id) {
                acc.totalSent += transaction.amount
              } else if (transaction.recipient_id === user.id) {
                acc.totalReceived += transaction.amount
              }
            } else if (transaction.type === 'withdraw' && transaction.user_id === user.id) {
              acc.totalWithdrawn += transaction.amount
            }

            return acc
          },
          { totalSent: 0, totalReceived: 0, totalWithdrawn: 0 }
        )

        // Calculate monthly stats
        const monthlyStats = calculateMonthlyStats(transactions, user.id)

        setData({
          currentBalance: balance,
          ...totals,
          recentTransactions: transactions.slice(0, 10), // Only keep 10 most recent
          monthlyStats,
        })
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  return { data, loading, error }
}

function calculateMonthlyStats(transactions: Transaction[], userId: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const stats = new Map(months.map(month => [month, { name: month, sent: 0, received: 0, withdrawn: 0 }]))

  transactions.forEach(transaction => {
    if (transaction.status !== 'completed') return

    const date = new Date(transaction.created_at)
    const month = months[date.getMonth()]
    const monthData = stats.get(month)!

    if (transaction.type === 'send') {
      if (transaction.user_id === userId) {
        monthData.sent += transaction.amount
      } else if (transaction.recipient_id === userId) {
        monthData.received += transaction.amount
      }
    } else if (transaction.type === 'withdraw' && transaction.user_id === userId) {
      monthData.withdrawn += transaction.amount
    }
  })

  return Array.from(stats.values())
}
