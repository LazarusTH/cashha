// Backend Integration: This page is integrated with the backend API to fetch and manage transaction data.
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"

interface Transaction {
  id: number
  type: string
  amount: number
  username: string
  status: string
  date: string
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const transactionChannel = supabase
      .channel('admin_transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
      }, () => {
        fetchTransactions()
      })
      .subscribe()

    return () => {
      transactionChannel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/admin/transactions')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions')
      }

      setTransactions(data.transactions)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch transactions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value.toLowerCase())
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const handleStatusChange = async (transactionId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction status')
      }

      // Update local state
      setTransactions(transactions.map(transaction =>
        transaction.id === transactionId
          ? { ...transaction, status: newStatus }
          : transaction
      ))

      // Send notification to user
      await fetch(`/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.transaction.user_id,
          type: 'transaction_update',
          message: `Transaction #${transactionId} status updated to ${newStatus}`,
        }),
      })

      toast({
        title: 'Success',
        description: 'Transaction status updated successfully',
      })
    } catch (error) {
      console.error('Error updating transaction status:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update transaction status',
        variant: 'destructive',
      })
    }
  }

  const handleTransactionDetails = async (transactionId: number) => {
    try {
      const response = await fetch(`/api/admin/transactions/${transactionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transaction details')
      }

      // Show transaction details in a modal
      setSelectedTransaction(data.transaction)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Error fetching transaction details:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch transaction details',
        variant: 'destructive',
      })
    }
  }

  const handleExportTransactions = async () => {
    try {
      const response = await fetch('/api/admin/transactions/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter,
          sortBy,
          sortOrder,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to export transactions')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions_${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'Transactions exported successfully',
      })
    } catch (error) {
      console.error('Error exporting transactions:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export transactions',
        variant: 'destructive',
      })
    }
  }

  const filteredAndSortedTransactions = transactions
    .filter(
      (transaction) =>
        transaction.type.toLowerCase().includes(filter) ||
        transaction.username.toLowerCase().includes(filter) ||
        transaction.status.toLowerCase().includes(filter),
    )
    .sort((a, b) => {
      if (a[sortBy as keyof typeof a] < b[sortBy as keyof typeof b]) return sortOrder === "asc" ? -1 : 1
      if (a[sortBy as keyof typeof a] > b[sortBy as keyof typeof b]) return sortOrder === "asc" ? 1 : -1
      return 0
    })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Input
              placeholder="Filter transactions..."
              value={filter}
              onChange={handleFilterChange}
              className="max-w-sm"
            />
            <div className="flex items-center space-x-2">
              <Select onValueChange={handleSortChange} defaultValue={sortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={toggleSortOrder} variant="outline">
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
              <Button onClick={handleExportTransactions} variant="primary">
                Export
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount (ETB)</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.date).toLocaleString()}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.amount.toLocaleString()}</TableCell>
                    <TableCell>{transaction.username}</TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) => handleStatusChange(transaction.id, value)}
                        defaultValue={transaction.status}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => handleTransactionDetails(transaction.id)} variant="primary">
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
