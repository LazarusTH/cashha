"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

interface DepositRequest {
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
  receipt_url: string
  transaction_id?: string
  processed_at?: string
  rejection_reason?: string
  metadata?: {
    adminNote?: string
  }
}

export function DepositsClient() {
  const [requests, setRequests] = useState<DepositRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchDepositRequests()
  }, [])

  const fetchDepositRequests = async () => {
    try {
      const response = await fetch('/api/admin/deposits')
      if (!response.ok) {
        throw new Error('Failed to fetch deposit requests')
      }
      const data = await response.json()
      setRequests(data.deposits)
    } catch (err) {
      console.error('Error fetching deposit requests:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string, note: string) => {
    try {
      const response = await fetch(`/api/admin/deposits/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve deposit')
      }

      const data = await response.json()
      setRequests(requests.map(request => 
        request.id === requestId ? data.deposit : request
      ))
      setIsDialogOpen(false)
      toast({
        title: "Success",
        description: "Deposit request approved successfully",
      })
    } catch (err) {
      console.error('Error approving deposit:', err)
      toast({
        title: "Error",
        description: "Failed to approve deposit",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/deposits/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject deposit')
      }

      const data = await response.json()
      setRequests(requests.map(request => 
        request.id === requestId ? data.deposit : request
      ))
      setIsDialogOpen(false)
      toast({
        title: "Success",
        description: "Deposit request rejected successfully",
      })
    } catch (err) {
      console.error('Error rejecting deposit:', err)
      toast({
        title: "Error",
        description: "Failed to reject deposit",
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
          <CardTitle>Deposit Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>
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
                <DialogTitle>Review Deposit Request</DialogTitle>
              </DialogHeader>
              <DepositReviewForm
                request={selectedRequest}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deposit Request Details</DialogTitle>
              </DialogHeader>
              <DepositDetailView request={selectedRequest} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

function DepositReviewForm({
  request,
  onApprove,
  onReject,
}: {
  request: DepositRequest
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
        <Label>Receipt</Label>
        <div className="relative h-[300px] w-full">
          <Image
            src={request.receipt_url}
            alt="Deposit Receipt"
            fill
            className="object-contain"
          />
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
        <Input
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

function DepositDetailView({ request }: { request: DepositRequest }) {
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
        <div className="space-y-2">
          <Label>Receipt</Label>
          <div className="relative h-[300px] w-full">
            <Image
              src={request.receipt_url}
              alt="Deposit Receipt"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  )
} 