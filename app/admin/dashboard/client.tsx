'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, UsersIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  loading?: boolean
}

interface DashboardData {
  metrics: {
    totalUsers: number
    totalDeposits: number
    totalWithdrawals: number
    totalSendingRequests: number
  }
  recentTransactions: {
    id: number
    type: string
    amount: number
    username: string
    status: string
    date: string
  }[]
  chartData: {
    date: string
    deposits: number
    withdrawals: number
    sends: number
  }[]
  supportRequests: {
    id: number
    userId: number
    username: string
    subject: string
    message: string
    status: string
    date: string
  }[]
}

function MetricCard({ title, value, icon, loading }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-[100px]" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardClient() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    metrics: {
      totalUsers: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalSendingRequests: 0,
    },
    recentTransactions: [],
    chartData: [],
    supportRequests: [],
  })
  const [timeRange, setTimeRange] = useState("7d")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch metrics
      const [
        { data: users },
        { data: deposits },
        { data: withdrawals },
        { data: sendingRequests },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("deposits").select("amount"),
        supabase.from("withdrawals").select("amount"),
        supabase.from("sending_requests").select("amount"),
      ])

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      // Fetch chart data
      const { data: chartData } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", getDateFromRange(timeRange))
        .order("created_at", { ascending: true })

      // Fetch support requests
      const { data: supportRequests } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      setDashboardData({
        metrics: {
          totalUsers: users?.length || 0,
          totalDeposits: deposits?.reduce((sum, d) => sum + d.amount, 0) || 0,
          totalWithdrawals: withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0,
          totalSendingRequests: sendingRequests?.length || 0,
        },
        recentTransactions: transactions || [],
        chartData: processChartData(chartData || []),
        supportRequests: supportRequests || [],
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getDateFromRange = (range: string) => {
    const now = new Date()
    switch (range) {
      case "7d":
        return new Date(now.setDate(now.getDate() - 7))
      case "30d":
        return new Date(now.setDate(now.getDate() - 30))
      case "90d":
        return new Date(now.setDate(now.getDate() - 90))
      case "1y":
        return new Date(now.setFullYear(now.getFullYear() - 1))
      default:
        return new Date(now.setDate(now.getDate() - 7))
    }
  }

  const processChartData = (data: any[]) => {
    // Group transactions by date and type
    const groupedData = data.reduce((acc: any, transaction: any) => {
      const date = new Date(transaction.created_at).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = { deposits: 0, withdrawals: 0, sends: 0 }
      }
      switch (transaction.type) {
        case "deposit":
          acc[date].deposits += transaction.amount
          break
        case "withdrawal":
          acc[date].withdrawals += transaction.amount
          break
        case "send":
          acc[date].sends += transaction.amount
          break
      }
      return acc
    }, {})

    // Convert to array format for chart
    return Object.entries(groupedData).map(([date, values]: [string, any]) => ({
      date,
      ...values,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={loading ? '...' : dashboardData.metrics.totalUsers.toLocaleString()}
          icon={<UsersIcon className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <MetricCard
          title="Total Deposits"
          value={loading ? '...' : `${dashboardData.metrics.totalDeposits.toLocaleString()} ETB`}
          icon={<ArrowDownIcon className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <MetricCard
          title="Total Withdrawals"
          value={loading ? '...' : `${dashboardData.metrics.totalWithdrawals.toLocaleString()} ETB`}
          icon={<ArrowUpIcon className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <MetricCard
          title="Total Sending Requests"
          value={loading ? '...' : dashboardData.metrics.totalSendingRequests.toLocaleString()}
          icon={<ArrowRightIcon className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboardData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  name="Deposits"
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  stackId="1"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  name="Withdrawals"
                />
                <Area
                  type="monotone"
                  dataKey="sends"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  name="Sends"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboardData.recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.username}</TableCell>
                        <TableCell className="capitalize">{transaction.type}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'ETB',
                          }).format(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === 'completed'
                                ? 'success'
                                : transaction.status === 'pending'
                                ? 'warning'
                                : 'destructive'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {loading ? (
                  Array(3)
                    .fill(null)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                ) : (
                  dashboardData.supportRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col space-y-2 rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{request.username}</span>
                        <Badge
                          variant={
                            request.status === 'resolved'
                              ? 'success'
                              : request.status === 'pending'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.subject}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(request.date).toLocaleDateString()}
                        </span>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 