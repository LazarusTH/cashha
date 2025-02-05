"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data
const withdrawalHistory = [
  { id: 1, amount: 1000, status: "Completed", date: "2023-06-01" },
  { id: 2, amount: 500, status: "Pending", date: "2023-06-05" },
  // Add more mock history...
]

const banks = [
  { id: 1, name: "Bank A" },
  { id: 2, name: "Bank B" },
  // Add more mock banks...
]

export default function WithdrawPage() {
  const [amount, setAmount] = useState("")
  const [bank, setBank] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolderName, setAccountHolderName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement withdrawal request logic
    console.log("Withdrawal request:", { amount, bank, accountNumber, accountHolderName })
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
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
                Bank
              </label>
              <Select onValueChange={setBank} required>
                <SelectTrigger>
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
            <Button type="submit">Submit Withdrawal Request</Button>
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
                <TableHead>Amount (ETB)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalHistory.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>{withdrawal.amount}</TableCell>
                  <TableCell>{withdrawal.status}</TableCell>
                  <TableCell>{withdrawal.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

