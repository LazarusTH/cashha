"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data for transactions
const mockTransactions = [
  { id: 1, type: "Deposit", amount: 1000, status: "Completed", date: "2023-07-05", details: "Bank transfer" },
  { id: 2, type: "Withdrawal", amount: -500, status: "Pending", date: "2023-07-04", details: "ATM withdrawal" },
  { id: 3, type: "Send", amount: -200, status: "Completed", date: "2023-07-03", details: "To: john@example.com" },
  { id: 4, type: "Receive", amount: 300, status: "Completed", date: "2023-07-02", details: "From: jane@example.com" },
  { id: 5, type: "Deposit", amount: 1500, status: "Completed", date: "2023-07-01", details: "Cash deposit" },
  // Add more mock transactions as needed
]

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState(mockTransactions)
  const [filter, setFilter] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // TODO: Fetch transactions from backend API
  // useEffect(() => {
  //   const fetchTransactions = async () => {
  //     try {
  //       const response = await fetch('/api/transactions')
  //       const data = await response.json()
  //       setTransactions(data)
  //     } catch (error) {
  //       console.error('Error fetching transactions:', error)
  //     }
  //   }
  //   fetchTransactions()
  // }, [])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value.toLowerCase())
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const filteredAndSortedTransactions = transactions
    .filter(
      (transaction) =>
        transaction.type.toLowerCase().includes(filter) ||
        transaction.status.toLowerCase().includes(filter) ||
        transaction.details.toLowerCase().includes(filter),
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
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                    {transaction.amount >= 0 ? "+" : ""}
                    {transaction.amount}
                  </TableCell>
                  <TableCell>{transaction.status}</TableCell>
                  <TableCell>{transaction.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredAndSortedTransactions.length === 0 && (
            <p className="text-center text-gray-500 mt-4">No transactions found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

