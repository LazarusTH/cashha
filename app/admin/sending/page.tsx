"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SendRequest {
  id: string;
  sender_id: string;
  sender: {
    email: string;
    full_name: string;
  };
  recipient: {
    email: string;
    full_name: string;
  };
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  transaction_id?: string;
  metadata?: {
    rejection_reason?: string;
    processing_date?: string;
    processing_time?: string;
  };
}

export default function SendingRequestsPage() {
  const [requests, setRequests] = useState<SendRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SendRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSendingRequests();
  }, []);

  const fetchSendingRequests = async () => {
    try {
      const response = await fetch('/api/admin/sending-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch sending requests');
      }
      const data = await response.json();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError('Error loading sending requests. Please try again later.');
      console.error('Error fetching sending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const response = await fetch('/api/admin/sending-requests/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status: 'approved',
          metadata: {
            processing_date: new Date().toLocaleDateString(),
            processing_time: new Date().toLocaleTimeString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      await fetchSendingRequests();
      setIsDialogOpen(false);
    } catch (err) {
      console.error('Error approving request:', err);
      setError('Failed to approve request. Please try again.');
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/sending-requests/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status: 'rejected',
          metadata: {
            rejection_reason: reason,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      await fetchSendingRequests();
      setIsDialogOpen(false);
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject request. Please try again.');
    }
  };

  if (loading) {
    return (
      <Alert>
        <AlertDescription>
          Loading sending requests...
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
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
                  <TableCell>{request.sender.full_name}</TableCell>
                  <TableCell>{request.recipient.full_name}</TableCell>
                  <TableCell>{request.amount} ETB</TableCell>
                  <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{request.status}</TableCell>
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
                      {request.status === 'pending' && (
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Sender</Label>
                <div>{selectedRequest.sender.full_name} ({selectedRequest.sender.email})</div>
              </div>
              <div>
                <Label>Recipient</Label>
                <div>{selectedRequest.recipient.full_name} ({selectedRequest.recipient.email})</div>
              </div>
              <div>
                <Label>Amount</Label>
                <div>{selectedRequest.amount} ETB</div>
              </div>
              <div>
                <Label>Date</Label>
                <div>{new Date(selectedRequest.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => handleApprove(selectedRequest.id)}>
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const reason = prompt('Enter rejection reason:');
                    if (reason) {
                      handleReject(selectedRequest.id, reason);
                    }
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Sender</Label>
                <div>{selectedRequest.sender.full_name} ({selectedRequest.sender.email})</div>
              </div>
              <div>
                <Label>Recipient</Label>
                <div>{selectedRequest.recipient.full_name} ({selectedRequest.recipient.email})</div>
              </div>
              <div>
                <Label>Amount</Label>
                <div>{selectedRequest.amount} ETB</div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="capitalize">{selectedRequest.status}</div>
              </div>
              <div>
                <Label>Date</Label>
                <div>{new Date(selectedRequest.created_at).toLocaleDateString()}</div>
              </div>
              {selectedRequest.transaction_id && (
                <div>
                  <Label>Transaction ID</Label>
                  <div>{selectedRequest.transaction_id}</div>
                </div>
              )}
              {selectedRequest.metadata?.processing_date && (
                <div>
                  <Label>Processing Date</Label>
                  <div>{selectedRequest.metadata.processing_date}</div>
                </div>
              )}
              {selectedRequest.metadata?.processing_time && (
                <div>
                  <Label>Processing Time</Label>
                  <div>{selectedRequest.metadata.processing_time}</div>
                </div>
              )}
              {selectedRequest.metadata?.rejection_reason && (
                <div>
                  <Label>Rejection Reason</Label>
                  <div>{selectedRequest.metadata.rejection_reason}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
