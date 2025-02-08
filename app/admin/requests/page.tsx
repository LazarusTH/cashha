"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

interface BaseRequest {
  id: number
  userId: number
  username: string
  amount: number
  status: string
  date: string
}

interface DepositRequest extends BaseRequest {
  receipt: string
}

interface WithdrawalRequest extends BaseRequest {}

interface SendingRequest extends BaseRequest {
  senderId: number
  senderUsername: string
  recipientUsername: string
}

interface RequestsData {
  deposit: DepositRequest[]
  withdrawal: WithdrawalRequest[]
  sending: SendingRequest[]
}

export default function RequestsManagement() {
  const [requests, setRequests] = useState<RequestsData>({
    deposit: [],
    withdrawal: [],
    sending: [],
  })
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const [depositRes, withdrawalRes, sendingRes] = await Promise.all([
        fetch('/api/admin/requests/deposit'),
        fetch('/api/admin/requests/withdrawal'),
        fetch('/api/admin/requests/sending'),
      ])

      if (!depositRes.ok || !withdrawalRes.ok || !sendingRes.ok) {
        throw new Error('Failed to fetch requests')
      }

      const [depositData, withdrawalData, sendingData] = await Promise.all([
        depositRes.json(),
        withdrawalRes.json(),
        sendingRes.json(),
      ])

      setRequests({
        deposit: depositData.requests,
        withdrawal: withdrawalData.requests,
        sending: sendingData.requests,
      })
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch requests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (type: "deposit" | "withdrawal" | "sending", requestId: number) => {
    try {
      const response = await fetch(`/api/admin/requests/${type}/${requestId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to approve request')
      }

      // Update local state
      setRequests(prev => ({
        ...prev,
        [type]: prev[type].map(request =>
          request.id === requestId ? { ...request, status: 'Approved' } : request
        ),
      }))

      toast({
        title: 'Success',
        description: 'Request approved successfully',
      })
    } catch (error) {
      console.error('Error approving request:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve request',
        variant: 'destructive',
      })
    } finally {
      setIsDetailDialogOpen(false)
    }
  }

  const handleReject = async (type: "deposit" | "withdrawal" | "sending", requestId: number) => {
    if (!rejectionReason) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/requests/${type}/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject request')
      }

      // Update local state
      setRequests(prev => ({
        ...prev,
        [type]: prev[type].map(request =>
          request.id === requestId ? { ...request, status: 'Rejected' } : request
        ),
      }))

      toast({
        title: 'Success',
        description: 'Request rejected successfully',
      })
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject request',
        variant: 'destructive',
      })
    } finally {
      setIsDetailDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Requests Management</h1>

      <Tabs defaultValue="deposit">
        <TabsList>
          <TabsTrigger value="deposit">Deposit Requests</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawal Requests</TabsTrigger>
          <TabsTrigger value="sending">Sending Requests</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="space-y-2 mt-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="deposit">
              <RequestsTable
                requests={requests.deposit}
                type="deposit"
                onViewDetails={(request) => {
                  setSelectedRequest({ ...request, type: 'deposit' })
                  setIsDetailDialogOpen(true)
                }}
              />
            </TabsContent>

            <TabsContent value="withdrawal">
              <RequestsTable
                requests={requests.withdrawal}
                type="withdrawal"
                onViewDetails={(request) => {
                  setSelectedRequest({ ...request, type: 'withdrawal' })
                  setIsDetailDialogOpen(true)
                }}
              />
            </TabsContent>

            <TabsContent value="sending">
              <RequestsTable
                requests={requests.sending}
                type="sending"
                onViewDetails={(request) => {
                  setSelectedRequest({ ...request, type: 'sending' })
                  setIsDetailDialogOpen(true)
                }}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <RequestDetailForm
              request={selectedRequest}
              onApprove={handleApprove}
              onReject={handleReject}
              rejectionReason={rejectionReason}
              onRejectionReasonChange={setRejectionReason}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RequestsTable({
  requests,
  type,
  onViewDetails,
}: {
  requests: any[]
  type: "deposit" | "withdrawal" | "sending"
  onViewDetails: (request: any) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{type.charAt(0).toUpperCase() + type.slice(1)} Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Amount (ETB)</TableHead>
              {type === "sending" && <TableHead>Recipient</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{new Date(request.date).toLocaleString()}</TableCell>
                <TableCell>{type === "sending" ? request.senderUsername : request.username}</TableCell>
                <TableCell>{request.amount.toLocaleString()}</TableCell>
                {type === "sending" && <TableCell>{request.recipientUsername}</TableCell>}
                <TableCell>{request.status}</TableCell>
                <TableCell>
                  <Button variant="outline" onClick={() => onViewDetails(request)}>
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function RequestDetailForm({
  request,
  onApprove,
  onReject,
  rejectionReason,
  onRejectionReasonChange,
}: {
  request: any
  onApprove: (type: "deposit" | "withdrawal" | "sending", requestId: number) => void
  onReject: (type: "deposit" | "withdrawal" | "sending", requestId: number) => void
  rejectionReason: string
  onRejectionReasonChange: (reason: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Username</Label>
          <div>{request.type === "sending" ? request.senderUsername : request.username}</div>
        </div>
        <div>
          <Label>Amount</Label>
          <div>{request.amount.toLocaleString()} ETB</div>
        </div>
        <div>
          <Label>Date</Label>
          <div>{new Date(request.date).toLocaleString()}</div>
        </div>
        <div>
          <Label>Status</Label>
          <div>{request.status}</div>
        </div>
        {request.type === "sending" && (
          <div>
            <Label>Recipient</Label>
            <div>{request.recipientUsername}</div>
          </div>
        )}
      </div>

      {request.type === "deposit" && request.receipt && (
        <div>
          <Label>Receipt</Label>
          <div className="mt-2 relative h-[200px] w-full">
            <Image
              src={request.receipt}
              alt="Receipt"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {request.status === "Pending" && (
        <div className="space-y-4">
          <div>
            <Label>Rejection Reason</Label>
            <Input
              value={rejectionReason}
              onChange={(e) => onRejectionReasonChange(e.target.value)}
              placeholder="Enter reason for rejection..."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="destructive"
              onClick={() => onReject(request.type, request.id)}
            >
              Reject
            </Button>
            <Button onClick={() => onApprove(request.type, request.id)}>
              Approve
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
