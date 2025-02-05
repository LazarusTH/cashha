"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

// Mock requests data
const mockRequests = {
  deposit: [
    {
      id: 1,
      userId: 1,
      username: "johndoe",
      amount: 1000,
      status: "Pending",
      date: "2023-07-05",
      receipt: "/placeholder.svg?height=200&width=200",
    },
    {
      id: 2,
      userId: 2,
      username: "janesmith",
      amount: 1500,
      status: "Approved",
      date: "2023-07-04",
      receipt: "/placeholder.svg?height=200&width=200",
    },
  ],
  withdrawal: [
    { id: 1, userId: 1, username: "johndoe", amount: 500, status: "Pending", date: "2023-07-05" },
    { id: 2, userId: 2, username: "janesmith", amount: 1000, status: "Approved", date: "2023-07-04" },
  ],
  sending: [
    {
      id: 1,
      senderId: 1,
      senderUsername: "johndoe",
      recipientUsername: "janesmith",
      amount: 300,
      status: "Pending",
      date: "2023-07-05",
    },
    {
      id: 2,
      senderId: 2,
      senderUsername: "janesmith",
      recipientUsername: "johndoe",
      amount: 500,
      status: "Approved",
      date: "2023-07-04",
    },
  ],
}

export default function RequestsManagement() {
  const [requests, setRequests] = useState(mockRequests)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const handleApprove = (type: "deposit" | "withdrawal" | "sending", requestId: number) => {
    // TODO: Integrate with backend API to approve request
    setRequests({
      ...requests,
      [type]: requests[type].map((request) =>
        request.id === requestId ? { ...request, status: "Approved" } : request,
      ),
    })
    setIsDetailDialogOpen(false)
    // TODO: Send email notification
    console.log(`Approved ${type} request ${requestId}`)
  }

  const handleReject = (type: "deposit" | "withdrawal" | "sending", requestId: number) => {
    // TODO: Integrate with backend API to reject request
    setRequests({
      ...requests,
      [type]: requests[type].map((request) =>
        request.id === requestId ? { ...request, status: "Rejected" } : request,
      ),
    })
    setIsDetailDialogOpen(false)
    // TODO: Send email notification with rejection reason
    console.log(`Rejected ${type} request ${requestId} with reason: ${rejectionReason}`)
    setRejectionReason("")
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
        <TabsContent value="deposit">
          <RequestsTable
            requests={requests.deposit}
            type="deposit"
            onViewDetails={(request) => {
              setSelectedRequest(request)
              setIsDetailDialogOpen(true)
            }}
          />
        </TabsContent>
        <TabsContent value="withdrawal">
          <RequestsTable
            requests={requests.withdrawal}
            type="withdrawal"
            onViewDetails={(request) => {
              setSelectedRequest(request)
              setIsDetailDialogOpen(true)
            }}
          />
        </TabsContent>
        <TabsContent value="sending">
          <RequestsTable
            requests={requests.sending}
            type="sending"
            onViewDetails={(request) => {
              setSelectedRequest(request)
              setIsDetailDialogOpen(true)
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            {selectedRequest && (
              <RequestDetailForm request={selectedRequest} onApprove={handleApprove} onReject={handleReject} />
            )}
          </ScrollArea>
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
              <TableHead>Username</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.username || request.senderUsername}</TableCell>
                <TableCell>{request.amount} ETB</TableCell>
                <TableCell>{request.date}</TableCell>
                <TableCell>{request.status}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => onViewDetails(request)}>
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
}: {
  request: any
  onApprove: (type: "deposit" | "withdrawal" | "sending", requestId: number) => void
  onReject: (type: "deposit" | "withdrawal" | "sending", requestId: number) => void
}) {
  const [rejectionReason, setRejectionReason] = useState("")
  const [receiptDetails, setReceiptDetails] = useState("")

  const requestType = request.receipt ? "deposit" : request.recipientUsername ? "sending" : "withdrawal"

  return (
    <div className="space-y-4">
      <div>
        <Label>Username</Label>
        <p>{request.username || request.senderUsername}</p>
      </div>
      {requestType === "sending" && (
        <div>
          <Label>Recipient</Label>
          <p>{request.recipientUsername}</p>
        </div>
      )}
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
      {requestType === "deposit" && (
        <div>
          <Label>Receipt</Label>
          <Image src={request.receipt || "/placeholder.svg"} alt="Receipt" width={200} height={200} />
        </div>
      )}
      {requestType === "withdrawal" && (
        <div>
          <Label htmlFor="receiptDetails">Receipt Details</Label>
          <Input
            id="receiptDetails"
            value={receiptDetails}
            onChange={(e) => setReceiptDetails(e.target.value)}
            placeholder="Enter receipt details"
          />
        </div>
      )}
      <div className="flex space-x-2">
        <Button onClick={() => onApprove(requestType, request.id)}>Approve</Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (rejectionReason) onReject(requestType, request.id)
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

