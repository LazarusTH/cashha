"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data for deposit transactions
const depositTransactions = [
  { id: 1, amount: 1000, status: "Pending", date: "2023-07-01" },
  { id: 2, amount: 1500, status: "Accepted", date: "2023-06-28" },
  { id: 3, amount: 500, status: "Rejected", date: "2023-06-25" },
]

export default function DepositPage() {
  const [fullName, setFullName] = useState("")
  const [amount, setAmount] = useState("")
  const [receipt, setReceipt] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with backend API to submit deposit request
    console.log("Deposit request:", { fullName, amount, receipt })

    // TODO: Update UI to show pending transaction
    // TODO: Integrate balance update upon approval
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Deposit Funds</h1>

      <Card>
        <CardHeader>
          <CardTitle>Request Deposit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (ETB)
              </label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="receipt" className="block text-sm font-medium text-gray-700">
                Upload Receipt
              </label>
              <Input id="receipt" type="file" onChange={(e) => setReceipt(e.target.files?.[0] || null)} required />
            </div>
            <Button type="submit">Submit Deposit Request</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deposit Transactions</CardTitle>
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
              {depositTransactions.map((transaction) => (
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

