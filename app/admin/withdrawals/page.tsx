// Backend Integration: This whole file needs to fetch and update data from the backend API.
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea} from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"


interface WithdrawalRequest {
  id: number;
  userId: number;
  username: string;
  amount: number;
  status: string;
  date: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  transactionId?: string; // Made optional
  processingDate?: string;
  processingTime?: string;
  rejectionReason?: string;
}

// Mock withdrawal requests data
const mockWithdrawalRequests: WithdrawalRequest[] = [
    {
    id: 1,
    userId: 1,
    username: "johndoe",
    amount: 500,
    status: "Pending",
    date: "2023-07-05",

    bankName: "Bank of America",
    accountNumber: "1234567890",
    accountHolderName: "John Doe",
  },
  {
    id: 2,
    userId: 2,
    username: "janesmith",
    amount: 1000,
    status: "Approved",
    date: "2023-07-04",
    bankName: "Chase",
    accountNumber: "9876543210",
    accountHolderName: "Jane Smith",
    transactionId: "12345",
    processingDate: "2023-07-05",
    processingTime: "10:00",
  }, 
  {
    id: 3,
    userId: 3,
    username: "bobjohnson",
    amount: 750,
    status: "Rejected",
    date: "2023-07-03",
    bankName: "Wells Fargo",
    accountNumber: "5678901234",
    accountHolderName: "Bob Johnson",
    rejectionReason: "Insufficient funds",
  },
]
//TODO: fix the request types

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>(mockWithdrawalRequests)
  const [selectedRequest, setSelectedRequest] = useState<(typeof mockWithdrawalRequests)[0] | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)


  const handleApprove = (requestId: number, transactionDetails: string) => {
    // Backend Integration: Send an API request to approve the withdrawal request
    setRequests(requests.map((request) => (request.id === requestId ? { ...request, status: "Approved" } : request)))
    setIsDialogOpen(false)
    // Backend Integration: Send an email notification to the user
    console.log(`Approved request ${requestId} with details: ${transactionDetails}`)
  }
  
  const handleReject = (requestId: number, reason: string) => {
    // Backend Integration: Integrate with backend API to reject withdrawal request
    setRequests(
      requests.map((request) => {
        if (request.id === requestId) {
            return { ...request, status: "Rejected", rejectionReason: reason };
        } else {
            return request;
        }
    })
    )
        setIsDialogOpen(false)

    // TODO: Send email notification to user
    console.log(`Rejected request ${requestId} with reason: ${reason}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Withdrawal Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
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
              {/* Backend Integration: Fetch real data and map it here */}
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.username}</TableCell>
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
            <DialogTitle>Review Withdrawal Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <WithdrawalReviewForm request={selectedRequest} onApprove={handleApprove} onReject={handleReject} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Withdrawal Request Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedRequest && <WithdrawalDetailView request={selectedRequest} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WithdrawalReviewForm({
  request,
  onApprove,
  onReject,
}: {
  request: (typeof mockWithdrawalRequests)[0]
  onApprove: (requestId: number, transactionDetails: string) => void
  onReject: (requestId: number, reason: string) => void
}) {
  const [transactionDetails, setTransactionDetails] = useState({
    transactionId: "",
    bankReference: "",
    processingDate: "",
    processingTime: "",
    notes: "",
  })
  const [rejectionReason, setRejectionReason] = useState("")

  const handleApprove = () => {
    const details = Object.entries(transactionDetails)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")
    onApprove(request.id, details)
  }

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-4 pr-4">
        <div>
          <Label>Username</Label>
          <p>{request.username}</p>
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
          <Label>Bank Name</Label>
          <p>{request.bankName}</p>
        </div>
        <div>
          <Label>Account Number</Label>
          <p>{request.accountNumber}</p>
        </div>
        <div>
          <Label>Account Holder's Name</Label>
          <p>{request.accountHolderName}</p>
        </div>
        <div>
          <Label htmlFor="transactionId">Transaction ID</Label>
          <Input
            id="transactionId"
            value={transactionDetails.transactionId}
            onChange={(e) => setTransactionDetails({ ...transactionDetails, transactionId: e.target.value })}
            placeholder="Enter transaction ID"
          />
        </div>
        <div>
          <Label htmlFor="bankReference">Bank Reference</Label>
          <Input
            id="bankReference"
            value={transactionDetails.bankReference}
            onChange={(e) => setTransactionDetails({ ...transactionDetails, bankReference: e.target.value })}
            placeholder="Enter bank reference"
          />
        </div>
        <div>
          <Label htmlFor="processingDate">Processing Date</Label>
          <Input
            id="processingDate"
            type="date"
            value={transactionDetails.processingDate}
            onChange={(e) => setTransactionDetails({ ...transactionDetails, processingDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="processingTime">Processing Time</Label>
          <Input
            id="processingTime"
            type="time"
            value={transactionDetails.processingTime}
            onChange={(e) => setTransactionDetails({ ...transactionDetails, processingTime: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={transactionDetails.notes}
            onChange={(e) => setTransactionDetails({ ...transactionDetails, notes: e.target.value })}
            placeholder="Enter any additional notes"
          />
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleApprove}>Approve</Button>
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
    </ScrollArea>
  )
}

function WithdrawalDetailView({ request }: { request: (typeof mockWithdrawalRequests)[0] }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Request ID</Label>
        <p>{request.id}</p>
      </div>
      <div>
        <Label>Username</Label>
        <p>{request.username}</p>
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
      <div>
        <Label>Bank Name</Label>
        <p>{request.bankName}</p>
      </div>
      <div>
        <Label>Account Number</Label>
        <p>{request.accountNumber}</p>
      </div>
      <div>
        <Label>Account Holder's Name</Label>
        <p>{request.accountHolderName}</p>
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

