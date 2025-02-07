"use client"

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
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon, DollarSignIcon, UsersIcon, BankIcon, LifeBuoyIcon } from "lucide-react"
import { useAdmin } from "@/lib/hooks/use-admin"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Transaction } from "@/lib/supabase/transactions"
import { Bank, createBank, updateBank, deleteBank } from "@/lib/supabase/banks"
import { SupportRequest, updateSupportRequestStatus } from "@/lib/supabase/support"
import { ProfileData } from "@/lib/supabase/profile"

interface MetricCardProps {
  title: string
  value: string | number
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

interface TransactionDialogProps {
  transaction: Transaction
  onUpdate: (status: Transaction['status'], note: string) => void
}

function TransactionDialog({ transaction, onUpdate }: TransactionDialogProps) {
  const [status, setStatus] = useState(transaction.status)
  const [note, setNote] = useState("")

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Admin Note</label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <Button onClick={() => onUpdate(status as Transaction['status'], note)}>
        Update Transaction
      </Button>
    </div>
  )
}

interface BankDialogProps {
  bank?: Bank
  onSubmit: (data: { name: string; status: Bank['status'] }) => void
}

function BankDialog({ bank, onSubmit }: BankDialogProps) {
  const [name, setName] = useState(bank?.name || "")
  const [status, setStatus] = useState<Bank['status']>(bank?.status || "active")

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Bank Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={status} onValueChange={value => setStatus(value as Bank['status'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => onSubmit({ name, status })}>
        {bank ? "Update Bank" : "Add Bank"}
      </Button>
    </div>
  )
}

interface SupportRequestDialogProps {
  request: SupportRequest
  onUpdate: (status: SupportRequest['status'], note: string) => void
}

function SupportRequestDialog({ request, onUpdate }: SupportRequestDialogProps) {
  const [status, setStatus] = useState(request.status)
  const [note, setNote] = useState("")

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={status} onValueChange={value => setStatus(value as SupportRequest['status'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Admin Note</label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <Button onClick={() => onUpdate(status as SupportRequest['status'], note)}>
        Update Support Request
      </Button>
    </div>
  )
}

export default function AdminDashboard() {
  const { 
    transactions, 
    transactionsLoading, 
    metrics,
    metricsLoading,
    updateLoading,
    users,
    usersLoading,
    banks,
    banksLoading,
    supportRequests,
    supportRequestsLoading,
    transactionStats,
    transactionStatsLoading,
    fetchTransactions,
    updateTransaction,
    fetchMetrics,
    fetchUsers,
    updateRole,
    fetchBanks,
    fetchSupportRequests,
    updateSupportRequest,
    fetchTransactionStats
  } = useAdmin()
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [showBankDialog, setShowBankDialog] = useState(false)
  const [selectedSupportRequest, setSelectedSupportRequest] = useState<SupportRequest | null>(null)
  const [showSupportRequestDialog, setShowSupportRequestDialog] = useState(false)

  const handleUpdateTransaction = async (status: Transaction['status'], note: string) => {
    if (!selectedTransaction) return
    try {
      // Update transaction status
      await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTransaction.id,
          status,
          metadata: {
            ...selectedTransaction.metadata,
            adminNote: note,
          },
        }),
      })
      setShowTransactionDialog(false)
      fetchTransactions()
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

  const handleBankSubmit = async (data: { name: string; status: Bank['status'] }) => {
    try {
      if (selectedBank) {
        // Update existing bank
        await fetch('/api/banks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedBank.id,
            ...data
          }),
        })
      } else {
        // Create new bank
        await fetch('/api/banks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }
      setShowBankDialog(false)
      fetchBanks()
    } catch (error) {
      console.error('Error managing bank:', error)
    }
  }

  const handleDeleteBank = async (id: string) => {
    try {
      await fetch(`/api/banks?id=${id}`, {
        method: 'DELETE',
      })
      fetchBanks()
    } catch (error) {
      console.error('Error deleting bank:', error)
    }
  }

  const handleUpdateSupportStatus = async (id: string, status: SupportRequest['status'], note?: string) => {
    try {
      await fetch('/api/support/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          note
        }),
      })
      setShowSupportRequestDialog(false)
      fetchSupportRequests()
    } catch (error) {
      console.error('Error updating support request:', error)
    }
  }

  const handleUpdateUserRole = async (id: string, role: 'admin' | 'user') => {
    try {
      // Update user role
      await fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          role,
        }),
      })
      fetchUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  if (metricsLoading || transactionsLoading || usersLoading || banksLoading || supportRequestsLoading || transactionStatsLoading) {
    return (
      <Alert variant="info">
        <AlertDescription>
          Loading dashboard data. Please wait...
        </AlertDescription>
      </Alert>
    )
  }

  if (updateLoading) {
    return (
      <Alert variant="info">
        <AlertDescription>
          Updating data. Please wait...
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metricsLoading ? "..." : metrics?.totalUsers || 0}
          icon={<UsersIcon className="h-4 w-4" />}
          loading={metricsLoading}
        />
        <MetricCard
          title="Total Transactions"
          value={metricsLoading ? "..." : formatCurrency(metrics?.totalTransactions || 0)}
          icon={<DollarSignIcon className="h-4 w-4" />}
          loading={metricsLoading}
        />
        <MetricCard
          title="Active Banks"
          value={metricsLoading ? "..." : metrics?.activeBanks || 0}
          icon={<BankIcon className="h-4 w-4" />}
          loading={metricsLoading}
        />
        <MetricCard
          title="Open Support Requests"
          value={metricsLoading ? "..." : metrics?.openSupportRequests || 0}
          icon={<LifeBuoyIcon className="h-4 w-4" />}
          loading={metricsLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionStatsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={transactionStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Deposits"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  name="Withdrawals"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="transfers"
                  name="Transfers"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="banks">Banks</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.user?.email}</TableCell>
                      <TableCell className="capitalize">{transaction.type}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.status === 'completed'
                              ? 'default'
                              : transaction.status === 'failed'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction)
                            setShowTransactionDialog(true)
                          }}
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog
            open={showTransactionDialog}
            onOpenChange={setShowTransactionDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Transaction</DialogTitle>
              </DialogHeader>
              {selectedTransaction && (
                <TransactionDialog
                  transaction={selectedTransaction}
                  onUpdate={handleUpdateTransaction}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="banks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Banks</CardTitle>
                <Button
                  onClick={() => {
                    setSelectedBank(null)
                    setShowBankDialog(true)
                  }}
                >
                  Add Bank
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell>{bank.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={bank.status === 'active' ? 'default' : 'outline'}
                        >
                          {bank.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBank(bank)
                              setShowBankDialog(true)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteBank(bank.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedBank ? "Edit Bank" : "Add Bank"}
                </DialogTitle>
              </DialogHeader>
              <BankDialog
                bank={selectedBank || undefined}
                onSubmit={handleBankSubmit}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.user?.email}</TableCell>
                      <TableCell>{request.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === 'resolved'
                              ? 'default'
                              : request.status === 'in_progress'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSupportRequest(request)
                            setShowSupportRequestDialog(true)
                          }}
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={showSupportRequestDialog} onOpenChange={setShowSupportRequestDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Support Request</DialogTitle>
              </DialogHeader>
              {selectedSupportRequest && (
                <SupportRequestDialog
                  request={selectedSupportRequest}
                  onUpdate={(status, note) => handleUpdateSupportStatus(selectedSupportRequest.id, status, note)}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleUpdateUserRole(
                              user.id,
                              value as 'admin' | 'user'
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
