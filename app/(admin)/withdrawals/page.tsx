"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Mock data
const withdrawalRequests = [
  { id: 1, user: "John Doe", amount: 1000, status: "Pending" },
  { id: 2, user: "Jane Smith", amount: 500, status: "Approved" },
  // Add more mock requests...
]

export default function WithdrawalRequests() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)

  const handleApprove = (request: any) => {
    setSelectedRequest(request)
    setIsDialogOpen(true)
  }

  const handleReject = (request: any) => {
    // TODO: Implement rejection logic
    console.log("Rejecting request:", request)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Amount (ETB)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawalRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.user}</TableCell>
                <TableCell>{request.amount}</TableCell>
                <TableCell>{request.status}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => handleApprove(request)}>
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleReject(request)}>
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
          </DialogHeader>
          <ApprovalForm request={selectedRequest} onClose={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ApprovalForm({ request, onClose }: { request: any; onClose: () => void }) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement approval logic
    console.log("Approving request:", request)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="transactionDetails" className="block text-sm font-medium text-gray-700">
          Transaction Details
        </label>
        <Input id="transactionDetails" name="transactionDetails" required />
      </div>
      <Button type="submit">Confirm Approval</Button>
    </form>
  )
}

