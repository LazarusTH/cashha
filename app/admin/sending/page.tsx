"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

const mockSendingRequests = [
  {
    id: 1,
    senderId: 1,
    senderUsername: "johndoe",
    recipientUsername: "janesmith",
    amount: 500,
    status: "Pending",
    date: "2023-07-05",
    transactionId: undefined,
    rejectionReason: undefined,
    processingDate: undefined,
    processingTime: undefined,
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
    rejectionReason: undefined,
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
    transactionId: undefined,
    rejectionReason: "Insufficient funds",
    processingDate: undefined,
    processingTime: undefined,
  },
];

interface SendRequest {
  id: number;
  senderId: number;
  senderUsername: string;
  recipientUsername: string;
  amount: number;
  status: string;
  date: string;
  transactionId?: string;
  rejectionReason?: string;
  processingDate?: string;
  processingTime?: string;
}

type Request = SendRequest;

export default function SendingRequestsPage() {
  const [requests, setRequests] = useState<Request[]>(mockSendingRequests);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleApprove = (requestId: number) => {
    setRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: "Approved",
              transactionId: "tx" + Math.floor(Math.random() * 10000),
              processingDate: new Date().toLocaleDateString(),
              processingTime: new Date().toLocaleTimeString(),
              rejectionReason: undefined,
            }
          : request
      )
    );
    setIsDialogOpen(false);
  };

  const handleReject = (requestId: number, reason: string) => {
    setRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: "Rejected",
              rejectionReason: reason,
              transactionId: undefined,
              processingDate: undefined,
              processingTime: undefined,
            }
          : request
      )
    );
    setIsDialogOpen(false);
  };

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
                          setSelectedRequest(request);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                      {request.status === "Pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsDialogOpen(true);
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
    </div>
  );
}
