"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'rejected';
  created_at: string;
  metadata?: {
    date_of_birth?: string;
    place_of_birth?: string;
    residence?: string;
    nationality?: string;
    balance?: number;
    send_limit?: number;
    withdraw_limit?: number;
    id_card_url?: string;
    rejection_reason?: string;
  };
}

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ))

      toast({
        title: "Success",
        description: "User updated successfully",
      })
    } catch (err) {
      console.error('Error updating user:', err)
      toast({
        title: "Error",
        description: "Failed to update user",
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
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="capitalize">{user.status}</TableCell>
                  <TableCell>{user.metadata?.balance || 0} ETB</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user)
                        setIsDetailDialogOpen(true)
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <p>{selectedUser.full_name}</p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p>{selectedUser.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value: 'admin' | 'user') => 
                      handleUpdateUser(selectedUser.id, { role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedUser.status}
                    onValueChange={(value: 'pending' | 'active' | 'rejected') =>
                      handleUpdateUser(selectedUser.id, { status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <p>{selectedUser.metadata?.date_of_birth || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Place of Birth</Label>
                  <p>{selectedUser.metadata?.place_of_birth || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Residence</Label>
                  <p>{selectedUser.metadata?.residence || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <p>{selectedUser.metadata?.nationality || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Balance</Label>
                  <p>{selectedUser.metadata?.balance || 0} ETB</p>
                </div>
                <div className="space-y-2">
                  <Label>Send Limit</Label>
                  <Input
                    type="number"
                    value={selectedUser.metadata?.send_limit || 0}
                    onChange={(e) =>
                      handleUpdateUser(selectedUser.id, {
                        metadata: {
                          ...selectedUser.metadata,
                          send_limit: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Withdraw Limit</Label>
                  <Input
                    type="number"
                    value={selectedUser.metadata?.withdraw_limit || 0}
                    onChange={(e) =>
                      handleUpdateUser(selectedUser.id, {
                        metadata: {
                          ...selectedUser.metadata,
                          withdraw_limit: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                {selectedUser.metadata?.id_card_url && (
                  <div className="space-y-2">
                    <Label>ID Card</Label>
                    <div className="relative h-[200px] w-full">
                      <Image
                        src={selectedUser.metadata.id_card_url}
                        alt="ID Card"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
                {selectedUser.metadata?.rejection_reason && (
                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <p className="text-red-600">{selectedUser.metadata.rejection_reason}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 