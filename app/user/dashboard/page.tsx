"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, LineChart } from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, WalletIcon } from "lucide-react"
import { useDashboardData } from "@/lib/hooks/use-dashboard-data"
import { useTransactionSubscription } from "@/lib/hooks/use-transaction-subscription"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  loading?: boolean
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

export default function UserDashboard() {
  const { data, loading, error, refetch } = useDashboardData()
  
  // Subscribe to transaction updates
  useTransactionSubscription(() => {
    refetch()
  })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load dashboard data. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Current Balance"
            value={loading ? "Loading..." : formatCurrency(data?.currentBalance || 0)}
            icon={<WalletIcon className="h-4 w-4" />}
            loading={loading}
          />
          <MetricCard
            title="Total Sent"
            value={loading ? "Loading..." : formatCurrency(data?.totalSent || 0)}
            icon={<ArrowUpIcon className="h-4 w-4" />}
            loading={loading}
          />
          <MetricCard
            title="Total Received"
            value={loading ? "Loading..." : formatCurrency(data?.totalReceived || 0)}
            icon={<ArrowDownIcon className="h-4 w-4" />}
            loading={loading}
          />
          <MetricCard
            title="Total Withdrawn"
            value={loading ? "Loading..." : formatCurrency(data?.totalWithdrawn || 0)}
            icon={<ArrowRightIcon className="h-4 w-4" />}
            loading={loading}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.monthlyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="#ef4444"
                    name="Sent"
                  />
                  <Line
                    type="monotone"
                    dataKey="received"
                    stroke="#22c55e"
                    name="Received"
                  />
                  <Line
                    type="monotone"
                    dataKey="withdrawn"
                    stroke="#3b82f6"
                    name="Withdrawn"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {data?.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <div>
                      <div className="font-medium">
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`font-medium ${
                      transaction.type === 'withdraw' || 
                      (transaction.type === 'send' && !transaction.recipient_id)
                        ? 'text-red-500'
                        : 'text-green-500'
                    }`}>
                      {transaction.type === 'withdraw' || 
                       (transaction.type === 'send' && !transaction.recipient_id)
                        ? '-'
                        : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
