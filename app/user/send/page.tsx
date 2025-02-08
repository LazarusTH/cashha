"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTransfer } from "@/lib/hooks/use-transfer"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import debounce from 'lodash/debounce'
import toast from "@/components/ui/toast"

export default function SendPage() {
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [recipientDetails, setRecipientDetails] = useState<any>(null)
  const { submitTransfer, loading, history, historyLoading, fetchHistory, searchRecipient, recipientSearchLoading } = useTransfer()

  const [userLimits, setUserLimits] = useState({
    dailyLimit: 0,
    dailyUsed: 0,
    monthlyLimit: 0,
    monthlyUsed: 0,
  })

  const [rateLimitInfo, setRateLimitInfo] = useState({
    remaining: 0,
    resetAt: new Date(),
  })

  useEffect(() => {
    fetchHistory()
    fetchUserLimits()
    fetchRateLimitInfo()
  }, [])

  const fetchUserLimits = async () => {
    try {
      const response = await fetch('/api/user/limits')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user limits')
      }
      setUserLimits(data)
    } catch (error) {
      console.error('Error fetching user limits:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch user limits',
        variant: 'destructive',
      })
    }
  }

  const fetchRateLimitInfo = async () => {
    try {
      const response = await fetch('/api/user/rate-limit')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rate limit info')
      }
      setRateLimitInfo(data)
    } catch (error) {
      console.error('Error fetching rate limit:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch rate limit info',
        variant: 'destructive',
      })
    }
  }

  // Debounce recipient search to avoid too many API calls
  const debouncedSearch = debounce(async (email: string) => {
    if (email) {
      const result = await searchRecipient(email)
      setRecipientDetails(result)
    } else {
      setRecipientDetails(null)
    }
  }, 500)

  useEffect(() => {
    debouncedSearch(recipient)
    return () => debouncedSearch.cancel()
  }, [recipient])

  const validateTransaction = async (amount: number) => {
    // Check rate limit
    if (rateLimitInfo.remaining <= 0) {
      const resetTime = new Date(rateLimitInfo.resetAt).toLocaleTimeString()
      throw new Error(`Transaction limit reached. Please try again after ${resetTime}`)
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    // Check user's balance
    const balanceResponse = await fetch('/api/user/balance')
    const balanceData = await balanceResponse.json()
    if (!balanceResponse.ok) {
      throw new Error(balanceData.error || 'Failed to check balance')
    }

    if (amount > balanceData.available) {
      throw new Error(`Insufficient balance. Available: ${formatCurrency(balanceData.available)}`)
    }

    // Verify recipient exists and is active
    if (!recipientDetails) {
      throw new Error('Invalid recipient')
    }

    const recipientResponse = await fetch(`/api/user/verify/${recipientDetails.id}`)
    const recipientData = await recipientResponse.json()
    if (!recipientResponse.ok || !recipientData.active) {
      throw new Error('Recipient account is not active')
    }
  }

  const validateAmount = (amount: number) => {
    const remainingDaily = userLimits.dailyLimit - userLimits.dailyUsed
    const remainingMonthly = userLimits.monthlyLimit - userLimits.monthlyUsed

    if (amount > remainingDaily) {
      throw new Error(`Amount exceeds daily remaining limit of ${formatCurrency(remainingDaily)}`)
    }

    if (amount > remainingMonthly) {
      throw new Error(`Amount exceeds monthly remaining limit of ${formatCurrency(remainingMonthly)}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return
    }

    try {
      await validateTransaction(Number(amount))
      validateAmount(Number(amount))
      const success = await submitTransfer(recipient, Number(amount), description)

      if (success) {
        setRecipient("")
        setAmount("")
        setDescription("")
        setRecipientDetails(null)
        fetchRateLimitInfo() // Update rate limit info after successful transfer
        fetchUserLimits() // Refresh limits after successful transfer
        toast({
          title: 'Success',
          description: 'Transfer completed successfully',
        })
      }
    } catch (error) {
      console.error('Transfer error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send money',
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-500'
      case 'failed':
        return 'text-red-500'
      default:
        return 'text-yellow-500'
    }
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Send Money</h1>

        <Card>
          <CardHeader>
            <CardTitle>Send Money</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium mb-1">
                  Recipient Email
                </label>
                <Input
                  id="recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter recipient's email"
                  required
                  disabled={loading}
                />
                {recipientSearchLoading && (
                  <p className="mt-1 text-sm text-gray-500">Searching...</p>
                )}
                {recipientDetails && (
                  <p className="mt-1 text-sm text-green-500">
                    Recipient found: {recipientDetails.full_name}
                  </p>
                )}
                {recipient && !recipientDetails && !recipientSearchLoading && (
                  <p className="mt-1 text-sm text-red-500">
                    Recipient not found
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Amount
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount to send"
                  min="0"
                  step="0.01"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description (Optional)
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for this transfer"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !recipientDetails}
                className="w-full"
              >
                {loading ? "Processing..." : "Send Money"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer History</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No transfer history found.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {transaction.user_id === transaction.recipient_id ? 'Received' : 'Sent'}
                        </TableCell>
                        <TableCell>
                          {transaction.user_id === transaction.recipient_id
                            ? transaction.sender.full_name || transaction.sender.email
                            : transaction.recipient.full_name || transaction.recipient.email}
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>
                          <span className={getStatusColor(transaction.status)}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
