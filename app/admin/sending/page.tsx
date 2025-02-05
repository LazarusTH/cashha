"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock sending requests data
const mockSendingRequests = [
  {
    id: 1,
    senderId: 1,
    senderUsername: "johndoe",
    recipientUsername: "janesmith",
    amount: 500,
    status: "Pending",
    date: "2023-07-05",
    transactionId: "tx123",
    processingDate: "2023-07-05",
    processingTime: "10:00 AM",
  },
  {
    id: 2,
    senderId: 2,
    senderUsername: "janesmith",
    recipientUsername: "bobjohnson",
    amount: 1000,
    status: "Approved",
    date: "2023-07-04",
    transactionId: "tx456",
    processingDate: "2023-07-04",
    processingTime: "11:30 AM",
  },
  {
    id: 3,
    senderId: 3,
    senderUsername: "bobjohnson",
    recipientUsername: "johndoe",
    amount: 750,
    status: "Rejected",
    date: "2023-07-03",
    rejectionReason: "Insufficient funds",
  },
]

export default function SendingRequestsPage() {
  const [requests, setRequests] = useState(mockSendingRequests)
  const [selectedRequest, setSelectedRequest] = useState<(typeof mockSendingRequests)[0] | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const handleApprove = (requestId: number) => {
    // TODO: Integrate with backend API to approve sending request
    setRequests(requests.map((request) => (request.id === requestId ? { ...request, status: "Approved" } : request)))
    setIsDialogOpen(false)
    // TODO: Send email notification to user
    console.log(`Approved sending request ${requestId}`)
  }

  const handleReject = (requestId: number, reason: string) => {
    // TODO: Integrate with backend API to reject sending request
    setRequests(
      requests.map((request) =>
        request.id === requestId ? { ...request, status: "Rejected", rejectionReason: reason } : request,
      ),
    )
    setIsDialogOpen(false)
    // TODO: Send email notification to user
    console.log(`Rejected sending request ${requestId} with reason: ${reason}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sending Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sender</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.senderUsername}</TableCell>
                  <TableCell>{request.recipientUsername}</TableCell>
                  <TableCell>{request.amount} ETB</TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  <TableCell>
                    <div className="space-x-2">
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
                      {request.status === "Pending" && (
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Sending Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <SendingReviewForm request={selectedRequest} onApprove={handleApprove} onReject={handleReject} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sending Request Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedRequest && <SendingDetailView request={selectedRequest} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SendingReviewForm({
  request,
  onApprove,
  onReject,
}: {
  request: (typeof mockSendingRequests)[0]
  onApprove: (requestId: number) => void
  onReject: (requestId: number, reason: string) => void
}) {
  const [rejectionReason, setRejectionReason] = useState("")

  return (
    <div className="space-y-4">
      <div>
        <Label>Sender</Label>
        <p>{request.senderUsername}</p>
      </div>
      <div>
        <Label>Recipient</Label>
        <p>{request.recipientUsername}</p>
      </div>
      <div>
        <Label>Amount</Label>
        <p>{request.amount} ETB</p>
      </div>
      <div>
        <Label>Date</Label>
        <p>{request.date}</p>
      </div>
      <div className="flex space-x-2">
        <Button onClick={() => onApprove(request.id)}>Approve</Button>
        <Button
          variant="outline"
          onClick={() => {
            if (rejectionReason) onReject(request.id, rejectionReason)
          }}
        >
          Reject
        </Button>
      </div>
      <div>
        <Label htmlFor="rejectionReason">Rejection Reason</Label>
        <Input
          id="rejectionReason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter reason for rejection"
        />
      </div>
    </div>
  )
}

function SendingDetailView({ request }: { request: (typeof mockSendingRequests)[0] }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Request ID</Label>
        <p>{request.id}</p>
      </div>
      <div>
        <Label>Sender Username</Label>
        <p>{request.senderUsername}</p>
      </div>
      <div>
        <Label>Recipient Username</Label>
        <p>{request.recipientUsername}</p>
      </div>
      <div>
        <Label>Amount</Label>
        <p>{request.amount} ETB</p>
      </div>
      <div>
        <Label>Date</Label>
        <p>{request.date}</p>
      </div>
      <div>
        <Label>Status</Label>
        <p>{request.status}</p>
      </div>
      {request.status !== "Pending" && (
        <>
          <div>
            <Label>Transaction ID</Label>
            <p>{request.transactionId || "N/A"}</p>
          </div>
          <div>
            <Label>Processing Date</Label>
            <p>{request.processingDate || "N/A"}</p>
          </div>
          <div>
            <Label>Processing Time</Label>
            <p>{request.processingTime || "N/A"}</p>
          </div>
          {request.status === "Rejected" && (
            <div>
              <Label>Rejection Reason</Label>
              <p>{request.rejectionReason || "N/A"}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

