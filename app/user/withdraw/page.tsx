"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useWithdraw } from "@/lib/hooks/use-withdraw"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import toast from "@/lib/toast"

// List of supported banks
const SUPPORTED_BANKS = [
  "Commercial Bank of Ethiopia",
  "Dashen Bank",
  "Awash Bank",
  "Abyssinia Bank",
  "Nib International Bank",
  "United Bank",
  "Wegagen Bank",
  "Zemen Bank",
  "Oromia International Bank",
  "Cooperative Bank of Oromia",
]

export default function WithdrawPage() {
  const [amount, setAmount] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [description, setDescription] = useState("")
  const [withdrawalLimits, setWithdrawalLimits] = useState({
    dailyLimit: 0,
    dailyUsed: 0,
    monthlyLimit: 0,
    monthlyUsed: 0,
    minAmount: 0,
    maxAmount: 0,
  })

  const { submitWithdrawal, loading, history, historyLoading, fetchHistory } = useWithdraw()

  useEffect(() => {
    fetchHistory()
    fetchWithdrawalLimits()
  }, [])

  const fetchWithdrawalLimits = async () => {
    try {
      const response = await fetch('/api/user/withdrawal-limits')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch withdrawal limits')
      }
      setWithdrawalLimits(data)
    } catch (error) {
      console.error('Error fetching withdrawal limits:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch withdrawal limits',
        variant: 'destructive',
      })
    }
  }

  const validateWithdrawal = (amount: number) => {
    if (amount < withdrawalLimits.minAmount) {
      throw new Error(`Minimum withdrawal amount is ${formatCurrency(withdrawalLimits.minAmount)}`)
    }

    if (amount > withdrawalLimits.maxAmount) {
      throw new Error(`Maximum withdrawal amount is ${formatCurrency(withdrawalLimits.maxAmount)}`)
    }

    const remainingDaily = withdrawalLimits.dailyLimit - withdrawalLimits.dailyUsed
    const remainingMonthly = withdrawalLimits.monthlyLimit - withdrawalLimits.monthlyUsed

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
      validateWithdrawal(Number(amount))

      // Verify bank account before submitting withdrawal
      const verifyResponse = await fetch('/api/bank/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName,
          accountNumber,
          accountName,
        }),
      })

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json()
        throw new Error(error.message || 'Failed to verify bank account')
      }

      const success = await submitWithdrawal({
        amount: Number(amount),
        bankName,
        accountNumber,
        accountName,
        description,
      })

      if (success) {
        setAmount("")
        setBankName("")
        setAccountNumber("")
        setAccountName("")
        setDescription("")
        fetchWithdrawalLimits() // Refresh limits after successful withdrawal
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit withdrawal',
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
        <h1 className="text-3xl font-bold">Withdraw Money</h1>

        <Card>
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Amount
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                  min="0"
                  step="0.01"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="bank" className="block text-sm font-medium mb-1">
                  Bank
                </label>
                <Select
                  value={bankName}
                  onValueChange={setBankName}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium mb-1">
                  Account Number
                </label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter your bank account number"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="accountName" className="block text-sm font-medium mb-1">
                  Account Holder Name
                </label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter account holder's name"
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
                  placeholder="Enter a description for this withdrawal"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !bankName}
                className="w-full"
              >
                {loading ? "Processing..." : "Submit Withdrawal Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
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
                  No withdrawal history found.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Account</TableHead>
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
                        <TableCell>{transaction.metadata.bankName}</TableCell>
                        <TableCell>{transaction.metadata.accountNumber}</TableCell>
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
