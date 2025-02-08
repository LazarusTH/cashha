"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface Bank {
  id: string
  name: string
  code: string
  logo_url?: string
}

interface BankAccount {
  id: string
  bank: Bank
  account_number: string
  account_name: string
  is_default: boolean
}

interface Transaction {
  id: string
  amount: number
  status: string
  created_at: string
}

export default function WithdrawPage() {
  const [amount, setAmount] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolderName, setAccountHolderName] = useState("")
  const [loading, setLoading] = useState(false)
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchBanks()
    fetchWithdrawals()
  }, [])

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/user/banks')
      const data = await response.json()
      if (data.accounts) {
        setBanks(data.accounts)
      }
    } catch (error) {
      console.error('Error fetching banks:', error)
      toast({
        title: "Error",
        description: "Failed to fetch bank accounts",
        variant: "destructive",
      })
    }
  }

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch('/api/withdraw')
      const data = await response.json()
      setWithdrawals(data)
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
      toast({
        title: "Error",
        description: "Failed to fetch withdrawal history",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          bankId: selectedBank,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process withdrawal')
      }

      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
      })

      // Reset form and refresh data
      setAmount("")
      setSelectedBank("")
      fetchWithdrawals()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process withdrawal",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Withdraw</h1>
      <Card>
        <CardHeader>
          <CardTitle>Request Withdrawal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (ETB)
              </label>
              <Input 
                id="amount" 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
                Select Bank Account
              </label>
              <Select onValueChange={setSelectedBank} value={selectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank account" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank.name} - {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No withdrawal history
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{withdrawal.amount}</TableCell>
                    <TableCell>{withdrawal.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
