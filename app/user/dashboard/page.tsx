"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, WalletIcon } from "lucide-react"

const data = [
  { name: "Jan", sent: 400, received: 300, withdrawn: 200 },
  { name: "Feb", sent: 300, received: 400, withdrawn: 250 },
  { name: "Mar", sent: 200, received: 500, withdrawn: 300 },
  { name: "Apr", sent: 278, received: 390, withdrawn: 280 },
  { name: "May", sent: 189, received: 480, withdrawn: 270 },
  { name: "Jun", sent: 239, received: 380, withdrawn: 290 },
]

export default function UserDashboard() {
  // TODO: Integrate with backend API to fetch real user data
  const currentBalance = 10000
  const totalSent = 5000
  const totalReceived = 8000
  const totalWithdrawn = 3000

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Current Balance" value={`$${currentBalance}`} icon={<WalletIcon className="h-4 w-4" />} />
        <MetricCard title="Total Sent" value={`$${totalSent}`} icon={<ArrowUpIcon className="h-4 w-4" />} />
        <MetricCard title="Total Received" value={`$${totalReceived}`} icon={<ArrowDownIcon className="h-4 w-4" />} />
        <MetricCard
          title="Total Withdrawn"
          value={`$${totalWithdrawn}`}
          icon={<ArrowRightIcon className="h-4 w-4" />}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="sent" stackId="1" stroke="#8884d8" fill="#8884d8" />
              <Area type="monotone" dataKey="received" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              <Area type="monotone" dataKey="withdrawn" stackId="1" stroke="#ffc658" fill="#ffc658" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sent" fill="#8884d8" />
              <Bar dataKey="received" fill="#82ca9d" />
              <Bar dataKey="withdrawn" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

