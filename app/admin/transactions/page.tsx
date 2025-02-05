// Backend Integration: This entire file needs to be connected to the backend to fetch and manage real transaction data.
// The backend should provide API endpoints to retrieve, filter, and sort transactions.
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock transaction data
// Backend Integration: Remove this mock data and fetch real data from the backend API.
const mockTransactions = [
  { id: 1, type: "Deposit", amount: 1000, username: "johndoe", status: "Completed", date: "2023-07-05" },
  { id: 2, type: "Withdrawal", amount: 500, username: "janesmith", status: "Pending", date: "2023-07-04" },
  { id: 3, type: "Send", amount: 200, username: "bobjonson", status: "Completed", date: "2023-07-03" },
]

// Backend Integration: Replace mockTransactions with data fetched from the backend API.
export default function TransactionHistory() {
  const [transactions, setTransactions] = useState(mockTransactions)
  const [filter, setFilter] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value.toLowerCase())
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  // Backend Integration: Handle filtering and sorting on the backend API side for better performance.
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
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount (ETB)</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Backend Integration: Populate table rows with data from backend API */}
              {filteredAndSortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>{transaction.amount}</TableCell>
                  <TableCell>{transaction.username}</TableCell>
                  <TableCell>{transaction.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

