"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, WalletIcon } from "lucide-react"
import React from "react"
import { LineChart } from "recharts"

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
    <div className="container max-w-7xl mx-auto px-4 py-6">
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
          <CardHeader className="pb-4">
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip  />
                  <Legend  />
                   <Line type="monotone" dataKey="sent" stroke="#0000FF" strokeWidth={3} dot={false} activeDot={true}  strokeDasharray="5 5"
                       />
                  <Line type="monotone" dataKey="received" stroke="#008000" strokeWidth={3} dot={false} activeDot={true}  strokeDasharray="5 5"
                       />
                     <Line type="monotone" dataKey="withdrawn" stroke="#FFFF00" strokeWidth={3} dot={false} activeDot={true}  strokeDasharray="5 5"
                       />
                </LineChart>


            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  
  return (
    <Card className="m-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-gray-500">{title}</CardTitle>
        {React.cloneElement(icon as any, { className: `h-4 w-4 text-blue-500` })}
      </CardHeader>
      <CardContent className="p-4">
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

