"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data for send transactions
const sendTransactions = [
  { id: 1, amount: 500, recipient: "john@example.com", status: "Completed", date: "2023-07-03" },
  { id: 2, amount: 750, recipient: "jane@example.com", status: "Pending", date: "2023-07-02" },
  { id: 3, amount: 300, recipient: "bob@example.com", status: "Failed", date: "2023-07-01" },
]

export default function SendPage() {
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [fee, setFee] = useState(0)

  useEffect(() => {
    // TODO: Replace with actual fee calculation logic
    setFee(Number.parseFloat(amount) * 0.005)
  }, [amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with backend API to submit send request
    console.log("Send request:", { recipient, amount, fee })

    // TODO: Update UI to show pending transaction
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Send Money</h1>

      <Card>
        <CardHeader>
          <CardTitle>Send Money</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                Recipient (Username or Email)
              </label>
              <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (ETB)
              </label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Fee: {fee.toFixed(2)} ETB</p>
            </div>
            <Button type="submit">Send Money</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount (ETB)</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sendTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.amount}</TableCell>
                  <TableCell>{transaction.recipient}</TableCell>
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

