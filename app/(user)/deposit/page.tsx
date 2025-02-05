"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data
const depositHistory = [
  { id: 1, amount: 1000, status: "Completed", date: "2023-06-01" },
  { id: 2, amount: 500, status: "Pending", date: "2023-06-05" },
  // Add more mock history...
]

export default function DepositPage() {
  const [amount, setAmount] = useState("")
  const [receipt, setReceipt] = useState<File | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement deposit request logic
    console.log("Deposit request:", { amount, receipt })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Deposit</h1>
      <Card>
        <CardHeader>
          <CardTitle>Request Deposit</CardTitle>
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
          <CardTitle>Deposit History</CardTitle>
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
              {depositHistory.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell>{deposit.amount}</TableCell>
                  <TableCell>{deposit.status}</TableCell>
                  <TableCell>{deposit.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

