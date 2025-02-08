"use client"
// Backend Integration: This whole file needs to be integrated with the backend API to fetch real user data and perform operations on it.

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/toast"
import { supabase } from "@/lib/supabase"

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

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isUserDetailDialogOpen, setIsUserDetailDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userChannel = supabase
      .channel('admin_users')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
      }, () => {
        fetchUsers()
      })
      .subscribe()

    return () => {
      userChannel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data)
      setPendingUsers(data.filter((user: User) => user.status === 'pending'))
      setError(null)
    } catch (err) {
      setError('Error loading users. Please try again later.')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (userData: Omit<User, 'id' | 'status' | 'created_at'>) => {
    try {
      const formData = new FormData()
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'id_card' && value instanceof File) {
            formData.append('id_card', value)
          } else {
            formData.append(key, String(value))
          }
        }
      })

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to create user')
      }

      await fetchUsers()
      setIsCreateDialogOpen(false)
    } catch (err) {
      console.error('Error creating user:', err)
      setError('Failed to create user. Please try again.')
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          status: 'active',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve user')
      }

      await fetchUsers()
      setIsDetailDialogOpen(false)
    } catch (err) {
      console.error('Error approving user:', err)
      setError('Failed to approve user. Please try again.')
    }
  }

  const handleRejectUser = async (userId: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/users/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          status: 'rejected',
          metadata: {
            rejection_reason: reason,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject user')
      }

      await fetchUsers()
      setIsDetailDialogOpen(false)
    } catch (err) {
      console.error('Error rejecting user:', err)
      setError('Failed to reject user. Please try again.')
    }
  }

  const handleUpdateUserLimits = async (userId: string, type: 'send' | 'withdraw', limit: number | null) => {
    try {
      const response = await fetch('/api/admin/users/update-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          [type === 'send' ? 'send_limit' : 'withdraw_limit']: limit,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user limits')
      }

      await fetchUsers()
    } catch (err) {
      console.error('Error updating user limits:', err)
      setError('Failed to update user limits. Please try again.')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      await fetchUsers()
      setIsUserDetailDialogOpen(false)
    } catch (err) {
      console.error('Error deleting user:', err)
      setError('Failed to delete user. Please try again.')
    }
  }

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to ${action} user`)
      }

      // Send notification to user
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: `user_${action}`,
          message: `Your account has been ${action}ed`,
          data,
        }),
      })

      await fetchUsers()
      toast({
        title: 'Success',
        description: `User ${action}ed successfully`,
      })
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} user`,
        variant: 'destructive',
      })
    }
  }

  const handleBlockUser = async (userId: string, reason: string) => {
    await handleUserAction(userId, 'block', { reason })
  }

  const handleUnblockUser = async (userId: string) => {
    await handleUserAction(userId, 'unblock')
  }

  const handleResetPassword = async (userId: string) => {
    await handleUserAction(userId, 'reset-password')
  }

  const handleUpdateUserLimits = async (userId: string, limits: { 
    send_limit?: number, 
    withdraw_limit?: number,
    daily_limit?: number,
    monthly_limit?: number 
  }) => {
    await handleUserAction(userId, 'update-limits', limits)
  }

  const handleVerifyKYC = async (userId: string) => {
    await handleUserAction(userId, 'verify-kyc')
  }

  const handleExportUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/export', {
        method: 'GET',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to export users')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'Users exported successfully',
      })
    } catch (error) {
      console.error('Error exporting users:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export users',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <Alert>
        <AlertDescription>
          Loading users...
        </AlertDescription>
      </Alert>
    )
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <div className="space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create New User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <CreateUserForm onSubmit={handleCreateUser} />
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsDetailDialogOpen(true)}>View Pending Users</Button>
        </div>
      </div>

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
                        setIsDetailDialogOpen(false)
                        setIsUserDetailDialogOpen(true)
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

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pending Users</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setIsDetailDialogOpen(false)
                          setIsUserDetailDialogOpen(true)
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDetailDialogOpen} onOpenChange={setIsUserDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedUser && (
              <UserDetailForm
                user={selectedUser}
                onApprove={handleApproveUser}
                onReject={handleRejectUser}
                onUpdateLimits={handleUpdateUserLimits}
                onDelete={handleDeleteUser}
                onBlock={handleBlockUser}
                onUnblock={handleUnblockUser}
                onResetPassword={handleResetPassword}
                onVerifyKYC={handleVerifyKYC}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CreateUserFormData {
  full_name: string;
  email: string;
  role: 'admin' | 'user';
  metadata: {
    date_of_birth?: string;
    place_of_birth?: string;
    residence?: string;
    nationality?: string;
    id_card?: File | null;
  };
}

function CreateUserForm({ onSubmit }: { onSubmit: (userData: CreateUserFormData) => void }) {
  const [formData, setFormData] = useState<CreateUserFormData>({
    full_name: '',
    email: '',
    role: 'user',
    metadata: {
      date_of_birth: '',
      place_of_birth: '',
      residence: '',
      nationality: '',
      id_card: null,
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'file' && e.target instanceof HTMLInputElement && e.target.files) {
      setFormData((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          id_card: e.target.files![0],
        },
      }))
    } else if (name === 'full_name' || name === 'email' || name === 'role') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [name]: value,
        },
      }))
    }
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            value={formData.metadata.date_of_birth}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="place_of_birth">Place of Birth</Label>
          <Input
            id="place_of_birth"
            name="place_of_birth"
            value={formData.metadata.place_of_birth}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="residence">Residence</Label>
          <Input
            id="residence"
            name="residence"
            value={formData.metadata.residence}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            name="nationality"
            value={formData.metadata.nationality}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select
            name="role"
            value={formData.role}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value as 'admin' | 'user' }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="id_card">ID Card Upload</Label>
          <Input
            id="id_card"
            name="id_card"
            type="file"
            onChange={handleChange}
            required
          />
        </div>
        <Button type="submit">Create User</Button>
      </form>
    </ScrollArea>
  )
}

interface UserDetailFormProps {
  user: User;
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
  onUpdateLimits: (userId: string, type: 'send' | 'withdraw', limit: number | null) => void;
  onDelete: (userId: string) => void;
  onBlock: (userId: string, reason: string) => void;
  onUnblock: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onVerifyKYC: (userId: string) => void;
}

function UserDetailForm({ user, onApprove, onReject, onUpdateLimits, onDelete, onBlock, onUnblock, onResetPassword, onVerifyKYC }: UserDetailFormProps) {
  const [limits, setLimits] = useState({
    send: {
      type: user.metadata?.send_limit ? 'custom' : 'none',
      value: user.metadata?.send_limit?.toString() || '',
      customDays: '',
    },
    withdraw: {
      type: user.metadata?.withdraw_limit ? 'custom' : 'none',
      value: user.metadata?.withdraw_limit?.toString() || '',
      customDays: '',
    },
  })
  const [rejectionReason, setRejectionReason] = useState('')

  const handleLimitChange = (operation: 'send' | 'withdraw', type: string) => {
    setLimits((prev) => ({
      ...prev,
      [operation]: { ...prev[operation], type },
    }))
  }

  const handleLimitValueChange = (operation: 'send' | 'withdraw', value: string) => {
    setLimits((prev) => ({
      ...prev,
      [operation]: { ...prev[operation], value },
    }))
  }

  const handleCustomDaysChange = (operation: 'send' | 'withdraw', value: string) => {
    setLimits((prev) => ({
      ...prev,
      [operation]: { ...prev[operation], customDays: value },
    }))
  }

  const handleSaveLimits = () => {
    onUpdateLimits(
      user.id,
      'send',
      limits.send.type === 'none' ? null : parseFloat(limits.send.value)
    )
    onUpdateLimits(
      user.id,
      'withdraw',
      limits.withdraw.type === 'none' ? null : parseFloat(limits.withdraw.value)
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <p>{user.full_name}</p>
      </div>
      <div>
        <Label>Email</Label>
        <p>{user.email}</p>
      </div>
      <div>
        <Label>Role</Label>
        <p className="capitalize">{user.role}</p>
      </div>
      <div>
        <Label>Status</Label>
        <p className="capitalize">{user.status}</p>
      </div>
      {user.metadata?.date_of_birth && (
        <div>
          <Label>Date of Birth</Label>
          <p>{user.metadata.date_of_birth}</p>
        </div>
      )}
      {user.metadata?.place_of_birth && (
        <div>
          <Label>Place of Birth</Label>
          <p>{user.metadata.place_of_birth}</p>
        </div>
      )}
      {user.metadata?.residence && (
        <div>
          <Label>Residence</Label>
          <p>{user.metadata.residence}</p>
        </div>
      )}
      {user.metadata?.nationality && (
        <div>
          <Label>Nationality</Label>
          <p>{user.metadata.nationality}</p>
        </div>
      )}
      {user.status !== 'pending' && (
        <div>
          <Label>Current Balance</Label>
          <p>{user.metadata?.balance || 0} ETB</p>
        </div>
      )}
      {user.metadata?.id_card_url && (
        <div>
          <Label>ID Card</Label>
          <div className="mt-2 border rounded-lg p-2">
            <Image
              src={user.metadata.id_card_url}
              alt={`ID Card of ${user.full_name}`}
              width={300}
              height={200}
              className="rounded-md"
            />
          </div>
        </div>
      )}
      <div className="space-y-4">
        {['send', 'withdraw'].map((operation) => (
          <div key={operation} className="space-y-2">
            <Label>{operation === 'send' ? 'Send Limit' : 'Withdraw Limit'}</Label>
            <Select
              value={limits[operation as 'send' | 'withdraw'].type}
              onValueChange={(value) => handleLimitChange(operation as 'send' | 'withdraw', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select limit type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Limit</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom Days</SelectItem>
              </SelectContent>
            </Select>
            {limits[operation as 'send' | 'withdraw'].type !== 'none' && (
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Enter limit amount"
                  value={limits[operation as 'send' | 'withdraw'].value}
                  onChange={(e) => handleLimitValueChange(operation as 'send' | 'withdraw', e.target.value)}
                />
                {limits[operation as 'send' | 'withdraw'].type === 'custom' && (
                  <Input
                    type="number"
                    placeholder="Enter number of days"
                    value={limits[operation as 'send' | 'withdraw'].customDays}
                    onChange={(e) => handleCustomDaysChange(operation as 'send' | 'withdraw', e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        <Button onClick={handleSaveLimits}>Save Limits</Button>
      </div>
      {user.status === 'pending' && (
        <>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Button onClick={() => onApprove(user.id)}>Approve User</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectionReason) {
                    onReject(user.id, rejectionReason)
                  }
                }}
              >
                Reject User
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
        </>
      )}
      <Button variant="destructive" onClick={() => onDelete(user.id)}>
        Delete User
      </Button>
      <Button variant="destructive" onClick={() => onBlock(user.id, 'Test reason')}>
        Block User
      </Button>
      <Button variant="destructive" onClick={() => onUnblock(user.id)}>
        Unblock User
      </Button>
      <Button variant="destructive" onClick={() => onResetPassword(user.id)}>
        Reset Password
      </Button>
      <Button variant="destructive" onClick={() => onVerifyKYC(user.id)}>
        Verify KYC
      </Button>
    </div>
  )
}
