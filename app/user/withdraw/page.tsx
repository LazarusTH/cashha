"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data for withdrawal transactions and banks
const withdrawalTransactions = [
  { id: 1, amount: 800, status: "Completed", date: "2023-07-02" },
  { id: 2, amount: 1200, status: "Pending", date: "2023-07-01" },
  { id: 3, amount: 500, status: "Rejected", date: "2023-06-30" },
]

const banks = [
  { id: 1, name: "Bank A" },
  { id: 2, name: "Bank B" },
  { id: 3, name: "Bank C" },
]

export default function WithdrawPage() {
  const [amount, setAmount] = useState("")
  const [bank, setBank] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolderName, setAccountHolderName] = useState("")
  const [fee, setFee] = useState(0)

  useEffect(() => {
    // TODO: Replace with actual fee calculation logic
    setFee(Number.parseFloat(amount) * 0.01)
  }, [amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with backend API to submit withdrawal request
    console.log("Withdrawal request:", { amount, bank, accountNumber, accountHolderName, fee })

    // TODO: Update UI to show pending transaction
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Withdraw Funds</h1>

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
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
                Bank
              </label>
              <Select onValueChange={setBank} required>
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.name}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                Account Number
              </label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700">
                Account Holder's Name
              </label>
              <Input
                id="accountHolderName"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                required
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Fee: {fee.toFixed(2)} ETB</p>
            </div>
            <Button type="submit">Submit Withdrawal Request</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount (ETB)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.amount}</TableCell>
                  <TableCell>{transaction.status}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

