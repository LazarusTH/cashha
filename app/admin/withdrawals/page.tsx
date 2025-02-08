// Backend Integration: This whole file needs to fetch and update data from the backend API.
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"

interface WithdrawalRequest {
  id: string
  user_id: string
  user: {
    id: string
    full_name: string
    email: string
  }
  amount: number
  status: "pending" | "approved" | "rejected"
  created_at: string
  bank_name: string
  account_number: string
  account_holder_name: string
  transaction_id?: string
  processed_at?: string
  rejection_reason?: string
  metadata?: {
    adminNote?: string
  }
}

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithdrawalRequests()
  }, [])

  const fetchWithdrawalRequests = async () => {
    try {
      const response = await fetch('/api/admin/withdrawals')
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal requests')
      }
      const data = await response.json()
      setRequests(data.withdrawals)
    } catch (err) {
      console.error('Error fetching withdrawal requests:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string, note: string) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve withdrawal')
      }

      const data = await response.json()
      setRequests(requests.map(request => 
        request.id === requestId ? data.withdrawal : request
      ))
      setIsDialogOpen(false)
      toast({
        title: "Success",
        description: "Withdrawal request approved successfully",
      })
    } catch (err) {
      console.error('Error approving withdrawal:', err)
      toast({
        title: "Error",
        description: "Failed to approve withdrawal",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/withdrawals/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject withdrawal')
      }

      const data = await response.json()
      setRequests(requests.map(request => 
        request.id === requestId ? data.withdrawal : request
      ))
      setIsDialogOpen(false)
      toast({
        title: "Success",
        description: "Withdrawal request rejected successfully",
      })
    } catch (err) {
      console.error('Error rejecting withdrawal:', err)
      toast({
        title: "Error",
        description: "Failed to reject withdrawal",
        variant: "destructive",
      })
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.user.full_name}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(request.amount)}
                  </TableCell>
                  <TableCell>{request.bank_name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(request.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request)
                        setIsDetailDialogOpen(true)
                      }}
                    >
                      View Details
                    </Button>
                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setIsDialogOpen(true)
                        }}
                      >
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRequest && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review Withdrawal Request</DialogTitle>
              </DialogHeader>
              <WithdrawalReviewForm
                request={selectedRequest}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdrawal Request Details</DialogTitle>
              </DialogHeader>
              <WithdrawalDetailView request={selectedRequest} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

function WithdrawalReviewForm({
  request,
  onApprove,
  onReject,
}: {
  request: WithdrawalRequest
  onApprove: (requestId: string, note: string) => void
  onReject: (requestId: string, reason: string) => void
}) {
  const [note, setNote] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(false)

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onApprove(request.id, note)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionReason.trim()) return

    setLoading(true)
    try {
      await onReject(request.id, rejectionReason)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>User</Label>
        <p>{request.user.full_name}</p>
      </div>
      <div className="space-y-2">
        <Label>Amount</Label>
        <p>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(request.amount)}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Bank Details</Label>
        <div className="space-y-1">
          <p><strong>Bank:</strong> {request.bank_name}</p>
          <p><strong>Account Number:</strong> {request.account_number}</p>
          <p><strong>Account Holder:</strong> {request.account_holder_name}</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Admin Note</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rejectionReason">Rejection Reason</Label>
        <Textarea
          id="rejectionReason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Required if rejecting"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRejectionReason("")}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleReject}
          disabled={loading || !rejectionReason.trim()}
        >
          Reject
        </Button>
        <Button
          type="button"
          onClick={handleApprove}
          disabled={loading}
        >
          Approve
        </Button>
      </div>
    </div>
  )
}

function WithdrawalDetailView({ request }: { request: WithdrawalRequest }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>User</Label>
          <p>{request.user.full_name}</p>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <p>{request.user.email}</p>
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <p>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(request.amount)}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Bank Details</Label>
          <div className="space-y-1">
            <p><strong>Bank:</strong> {request.bank_name}</p>
            <p><strong>Account Number:</strong> {request.account_number}</p>
            <p><strong>Account Holder:</strong> {request.account_holder_name}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <p className={`${
            request.status === 'approved' ? 'text-green-600' :
            request.status === 'rejected' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Submitted On</Label>
          <p>{format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</p>
        </div>
        {request.processed_at && (
          <div className="space-y-2">
            <Label>Processed On</Label>
            <p>{format(new Date(request.processed_at), 'MMM d, yyyy h:mm a')}</p>
          </div>
        )}
        {request.transaction_id && (
          <div className="space-y-2">
            <Label>Transaction ID</Label>
            <p>{request.transaction_id}</p>
          </div>
        )}
        {request.rejection_reason && (
          <div className="space-y-2">
            <Label>Rejection Reason</Label>
            <p className="text-red-600">{request.rejection_reason}</p>
          </div>
        )}
        {request.metadata?.adminNote && (
          <div className="space-y-2">
            <Label>Admin Note</Label>
            <p>{request.metadata.adminNote}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
