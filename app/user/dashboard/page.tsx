"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, LineChart } from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, WalletIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createBrowserClient } from "@supabase/ssr"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<any>(null)
  const [userStatus, setUserStatus] = useState<'active' | 'blocked' | 'pending'>('active')
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending' | 'rejected'>('pending')
  const [notifications, setNotifications] = useState<any[]>([])
  const [limits, setLimits] = useState({
    dailyRemaining: 0,
    monthlyRemaining: 0,
    sendLimit: 0,
    withdrawLimit: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      // Fetch dashboard data
      const response = await fetch('/api/user/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'))
    } finally {
      setLoading(false)
    }
  }

  // Check user status and verification
  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('status, verification_status')
          .eq('id', user.id)
          .single()

        if (error) throw error

        setUserStatus(profile.status)
        setVerificationStatus(profile.verification_status)

        // Redirect if blocked
        if (profile.status === 'blocked') {
          router.push('/blocked')
          return
        }

        // Show verification reminder
        if (profile.verification_status === 'pending') {
          toast({
            title: "Verification Required",
            description: "Please complete your account verification to unlock all features.",
            action: (
              <Button onClick={() => router.push('/verify')}>
                Verify Now
              </Button>
            ),
          })
        }
      } catch (error) {
        console.error('Error checking user status:', error)
      }
    }

    checkUserStatus()
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    const setupSubscriptions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const balanceChannel = supabase
          .channel('balance_updates')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'balances',
            filter: `user_id=eq.${user.id}`,
          }, () => {
            fetchDashboardData()
          })
          .subscribe()

        const notificationChannel = supabase
          .channel('user_notifications')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          }, () => {
            fetchNotifications()
          })
          .subscribe()

        const activityChannel = supabase
          .channel('user_activity')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'activity_log',
            filter: `user_id=eq.${user.id}`,
          }, () => {
            fetchRecentActivity()
          })
          .subscribe()

        return () => {
          balanceChannel.unsubscribe()
          notificationChannel.unsubscribe()
          activityChannel.unsubscribe()
        }
      } catch (error) {
        console.error('Error setting up subscriptions:', error)
        toast({
          title: 'Error',
          description: 'Failed to setup real-time updates',
          variant: 'destructive',
        })
      }
    }

    const cleanup = setupSubscriptions()
    return () => {
      cleanup.then(unsubscribe => unsubscribe?.())
    }
  }, [supabase, fetchDashboardData, fetchNotifications, fetchRecentActivity, toast])

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Fetch user limits
  useEffect(() => {
    const fetchLimits = async () => {
      if (!data?.user) return

      try {
        const { data: userLimits, error } = await supabase
          .from('user_limits')
          .select('*')
          .eq('user_id', data.user.id)
          .single()

        if (error) throw error

        // Calculate remaining limits
        const today = new Date()
        const thisMonth = today.getMonth()
        
        const { data: todayTransactions, error: todayError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', data.user.id)
          .gte('created_at', today.toISOString().split('T')[0])

        if (todayError) throw todayError

        const { data: monthTransactions, error: monthError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', data.user.id)
          .gte('created_at', new Date(today.getFullYear(), thisMonth, 1).toISOString())

        if (monthError) throw monthError

        const dailyTotal = todayTransactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0
        const monthlyTotal = monthTransactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0

        setLimits({
          dailyRemaining: userLimits.daily_limit - dailyTotal,
          monthlyRemaining: userLimits.monthly_limit - monthlyTotal,
          sendLimit: userLimits.send_limit,
          withdrawLimit: userLimits.withdraw_limit,
        })
      } catch (error) {
        console.error('Error fetching user limits:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch user limits',
          variant: 'destructive',
        })
      }
    }

    fetchLimits()
  }, [data?.user, supabase, toast])

  const fetchNotifications = async () => {
    if (!data?.user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setNotifications(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const fetchRecentActivity = async () => {
    if (!data?.user) return

    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentActivity(data)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {verificationStatus !== 'verified' && (
            <Alert variant="warning" className="max-w-md">
              <AlertTitle>Verification Required</AlertTitle>
              <AlertDescription>
                Complete verification to unlock all features.
                <Button variant="link" onClick={() => router.push('/verify')}>
                  Verify Now
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

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
            title="Pending Transactions"
            value={loading ? "Loading..." : String(data?.pendingTransactions || 0)}
            icon={<ArrowRightIcon className="h-4 w-4" />}
            loading={loading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Daily Limit Remaining</span>
                    <span>{formatCurrency(limits.dailyRemaining)}</span>
                  </div>
                  <Progress value={(limits.dailyRemaining / limits.sendLimit) * 100} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Monthly Limit Remaining</span>
                    <span>{formatCurrency(limits.monthlyRemaining)}</span>
                  </div>
                  <Progress value={(limits.monthlyRemaining / limits.sendLimit) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{activity.type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    {activity.amount && (
                      <span className={activity.type === 'credit' ? 'text-green-500' : 'text-red-500'}>
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.transactionHistory || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    name="Sent"
                    stroke="#ef4444"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="received"
                    name="Received"
                    stroke="#22c55e"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-center space-x-4 py-2">
                  <div className="flex-1">
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-gray-500">{notification.message}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <Badge variant="default">New</Badge>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
