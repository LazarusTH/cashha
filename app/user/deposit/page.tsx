"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeposit } from "@/lib/hooks/use-deposit"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import toast from "@/lib/toast"

export default function DepositPage() {
  const [fullName, setFullName] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [description, setDescription] = useState("")
  const { submitDeposit, loading, history, historyLoading, fetchHistory } = useDeposit()

  const [depositLimits, setDepositLimits] = useState({
    minAmount: 0,
    maxAmount: 0,
    dailyLimit: 0,
    dailyUsed: 0,
    monthlyLimit: 0,
    monthlyUsed: 0,
  })

  useEffect(() => {
    fetchHistory()
    fetchDepositLimits()
  }, [])

  const fetchDepositLimits = async () => {
    try {
      const response = await fetch('/api/user/deposit-limits')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deposit limits')
      }
      setDepositLimits(data)
    } catch (error) {
      console.error('Error fetching deposit limits:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch deposit limits',
        variant: 'destructive',
      })
    }
  }

  const validateDeposit = (amount: number) => {
    if (amount < depositLimits.minAmount) {
      throw new Error(`Minimum deposit amount is ${formatCurrency(depositLimits.minAmount)}`)
    }

    if (amount > depositLimits.maxAmount) {
      throw new Error(`Maximum deposit amount is ${formatCurrency(depositLimits.maxAmount)}`)
    }

    const remainingDaily = depositLimits.dailyLimit - depositLimits.dailyUsed
    if (amount > remainingDaily) {
      throw new Error(`Amount exceeds daily remaining limit of ${formatCurrency(remainingDaily)}`)
    }

    const remainingMonthly = depositLimits.monthlyLimit - depositLimits.monthlyUsed
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
      validateDeposit(Number(amount))

      // Verify payment method if selected
      if (paymentMethod) {
        const verifyResponse = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: paymentMethod,
            amount: Number(amount),
          }),
        })

        if (!verifyResponse.ok) {
          const error = await verifyResponse.json()
          throw new Error(error.message || 'Failed to verify payment method')
        }
      }

      const success = await submitDeposit({
        amount: Number(amount),
        paymentMethod,
        description,
      })

      if (success) {
        setAmount("")
        setPaymentMethod("")
        setDescription("")
        fetchDepositLimits() // Refresh limits after successful deposit
        toast({
          title: 'Success',
          description: 'Deposit request submitted successfully',
        })
      }
    } catch (error) {
      console.error('Deposit error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit deposit',
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
    switch (status) {
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
        <h1 className="text-3xl font-bold">Deposit Funds</h1>

        <Card>
          <CardHeader>
            <CardTitle>Request Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                />
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
                  placeholder="Enter amount to deposit"
                  min="0"
                  step="0.01"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium mb-1">
                  Payment Method
                </label>
                <Input
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="Enter payment method"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Processing..." : "Submit Deposit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deposit History</CardTitle>
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
                  No deposit history found.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
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
