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
import { supabase } from "@/lib/supabase"

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
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")
  const { toast } = useToast()

  useEffect(() => {
    const notificationChannel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
      }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_requests',
      }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      notificationChannel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard data')
      }

      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSupportRequestUpdate = async (requestId: number, status: string, response?: string) => {
    try {
      const res = await fetch(`/api/admin/support/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, response }),
      })

      if (!res.ok) {
        throw new Error('Failed to update support request')
      }

      // Update local state
      setDashboardData(prev => ({
        ...prev,
        supportRequests: prev.supportRequests.map(request =>
          request.id === requestId ? { ...request, status } : request
        ),
      }))

      toast({
        title: 'Success',
        description: 'Support request updated successfully',
      })
    } catch (error) {
      console.error('Error updating support request:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update support request',
        variant: 'destructive',
      })
    }
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
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{transaction.amount.toLocaleString()} ETB</TableCell>
                      <TableCell>{transaction.username}</TableCell>
                      <TableCell>{transaction.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {dashboardData.supportRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-medium">
                              {request.username} - {request.subject}
                            </CardTitle>
                            <div className="text-sm text-muted-foreground">
                              {new Date(request.date).toLocaleString()}
                            </div>
                          </div>
                          <Badge
                            variant={
                              request.status === 'pending'
                                ? 'default'
                                : request.status === 'resolved'
                                ? 'success'
                                : 'destructive'
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm">{request.message}</p>
                        {request.status === 'pending' && (
                          <div className="mt-4 flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => handleSupportRequestUpdate(request.id, 'resolved')}
                            >
                              Mark as Resolved
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 