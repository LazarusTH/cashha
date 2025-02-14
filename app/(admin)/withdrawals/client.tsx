"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface WithdrawalRequest {
  id: string
  amount: number
  status: string
  created_at: string
  user: {
    id: string
    email: string
    full_name: string
    balance: number
  }
  bank: {
    id: string
    bank_name: string
    account_number: string
    account_holder_name: string
  }
}

interface WithdrawalStats {
  total_pending: number
  total_approved: number
  total_rejected: number
  total_amount: number
}

export function WithdrawalsClient() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [stats, setStats] = useState<WithdrawalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    fetchWithdrawals()
  }, [page])

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch(`/api/admin/withdrawals?page=${page}&limit=10`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch withdrawals')
      }

      setWithdrawals(data.withdrawals)
      setStats(data.stats)
      setTotalPages(Math.ceil(data.pagination.total / data.pagination.limit))
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch withdrawals",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (request: WithdrawalRequest) => {
    setSelectedRequest(request)
    setIsDialogOpen(true)
  }

  const handleReject = async (request: WithdrawalRequest) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject withdrawal')
      }

      toast({
        title: "Success",
        description: "Withdrawal request rejected successfully",
      })

      fetchWithdrawals()
    } catch (error) {
      console.error('Error rejecting withdrawal:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject withdrawal",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Pending</div>
              <div className="text-2xl font-bold">{stats.total_pending}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Approved</div>
              <div className="text-2xl font-bold">{stats.total_approved}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Rejected</div>
              <div className="text-2xl font-bold">{stats.total_rejected}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="text-2xl font-bold">{stats.total_amount}</div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : withdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No withdrawal requests found</TableCell>
              </TableRow>
            ) : (
              withdrawals.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{format(new Date(request.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div>{request.user.full_name}</div>
                    <div className="text-sm text-gray-500">{request.user.email}</div>
                  </TableCell>
                  <TableCell>{request.amount}</TableCell>
                  <TableCell>
                    <div>{request.bank.bank_name}</div>
                    <div className="text-sm text-gray-500">{request.bank.account_number}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      request.status === 'approved' ? 'default' :
                      request.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => handleApprove(request)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(request)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
          </DialogHeader>
          <ApprovalForm request={selectedRequest} onClose={() => {
            setIsDialogOpen(false)
            fetchWithdrawals()
          }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ApprovalForm({ request, onClose }: { request: WithdrawalRequest | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!request) return

    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const response = await fetch(`/api/admin/withdrawals/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          transaction_details: formData.get('transactionDetails'),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve withdrawal')
      }

      toast({
        title: "Success",
        description: "Withdrawal request approved successfully",
      })
      onClose()
    } catch (error) {
      console.error('Error approving withdrawal:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve withdrawal",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!request) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="transactionDetails" className="block text-sm font-medium text-gray-700">
          Transaction Details
        </label>
        <Input id="transactionDetails" name="transactionDetails" required />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Confirm Approval"}
        </Button>
      </div>
    </form>
  )
} 