
"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, DollarSignIcon, UsersIcon } from "lucide-react"
import React from "react"

// Mock data for charts
const monthlyData = [
  { month: "Jan", deposits: 5000, withdrawals: 3000, transfers: 2000, fees: 500 },
  { month: "Feb", deposits: 6000, withdrawals: 3500, transfers: 2500, fees: 600 },
  { month: "Mar", deposits: 7000, withdrawals: 4000, transfers: 3000, fees: 700 },
  { month: "Apr", deposits: 8000, withdrawals: 4500, transfers: 3500, fees: 800 },
  { month: "May", deposits: 9000, withdrawals: 5000, transfers: 4000, fees: 900 },
  { month: "Jun", deposits: 10000, withdrawals: 5500, transfers: 4500, fees: 1000 },
]

// Mock data for recent transactions
const recentTransactions = [
  { id: 1, user: "John Doe", type: "Deposit", amount: 1000, date: "2023-07-05" },
  { id: 2, user: "Jane Smith", type: "Withdrawal", amount: 500, date: "2023-07-05" },
  { id: 3, user: "Bob Johnson", type: "Transfer", amount: 250, date: "2023-07-04" },
  { id: 4, user: "Alice Brown", type: "Deposit", amount: 2000, date: "2023-07-04" },
  { id: 5, user: "Charlie Davis", type: "Withdrawal", amount: 1000, date: "2023-07-03" },
]

export default function AdminDashboard() {
  const [selectedMonth, setSelectedMonth] = useState("Jun")

  // TODO: integrate API for dynamic dashboard data
  const totalTransactions = 15000
  const totalDeposits = 45000
  const totalWithdrawals = 25000
  const totalTransfers = 20000
  const totalFees = 5000
  const totalUsers = 1000

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Total Transactions"
            value={totalTransactions}
            icon={<ArrowRightIcon className="h-4 w-4" />}
          />
          <MetricCard title="Total Deposits" value={`$${totalDeposits}`} icon={<ArrowUpIcon className="h-4 w-4" />} />
          <MetricCard
            title="Total Withdrawals"
            value={`$${totalWithdrawals}`}
            icon={<ArrowDownIcon className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Transfers"
            value={`$${totalTransfers}`}
            icon={<ArrowRightIcon className="h-4 w-4" />}
          />
          <MetricCard title="Total Fees" value={`$${totalFees}`} icon={<DollarSignIcon className="h-4 w-4" />} />
          <MetricCard title="Total Users" value={totalUsers} icon={<UsersIcon className="h-4 w-4" />} />
        </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Monthly Fees</CardTitle>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthlyData.map((data) => (
                    <SelectItem key={data.month} value={data.month}>
                      {data.month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-xl font-bold pb-4">Monthly Fees Report</CardTitle>
              <div className="text-2xl font-bold">${monthlyData.find((data) => data.month === selectedMonth)?.fees}</div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="fees"
                      stroke="#008000" // Green color
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent User Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.user}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>${transaction.amount}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
 
    
  return (
    <Card className="m-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-gray-500">{title}</CardTitle>
        {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4 text-blue-500" })}
      </CardHeader>
      <CardContent className="p-4">
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}
