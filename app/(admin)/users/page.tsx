"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAdmin } from "@/lib/hooks/use-admin"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'rejected' | 'blocked';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [kycRejectionReason, setKycRejectionReason] = useState('')
  const { users, usersLoading, fetchUsers, updateRole } = useAdmin()
  const [isLimitsDialogOpen, setIsLimitsDialogOpen] = useState(false)
  const [limitsForm, setLimitsForm] = useState({
    sendLimit: '',
    withdrawLimit: '',
    dailyLimit: '',
    monthlyLimit: ''
  })
  const [isUpdatingLimits, setIsUpdatingLimits] = useState(false)
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false)
  const [isBlockingUser, setIsBlockingUser] = useState(false)
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false)
  const [balanceForm, setBalanceForm] = useState({
    amount: '',
    note: ''
  })
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    balance: false,
    limits: false,
    kyc: false,
    block: false,
    password: false
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    setLoadingStates(prev => ({ ...prev, [action]: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to ${action} user`)
      }

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
    } finally {
      setLoadingStates(prev => ({ ...prev, [action]: false }))
    }
  }

  const handleBalanceUpdate = async (newBalance: string, note: string) => {
    if (!selectedUser) return;
    
    if (!newBalance || isNaN(Number(newBalance))) {
      toast({
        title: "Error",
        description: "Please enter a valid balance amount",
        variant: "destructive",
      })
      return
    }

    if (!note.trim()) {
      toast({
        title: "Error",
        description: "Please provide a note for this adjustment",
        variant: "destructive",
      })
      return
    }

    await handleUserAction(selectedUser.id, 'update-balance', {
      amount: Number(newBalance),
      note: note.trim()
    })
  }

  const validateLimits = (limits: any) => {
    if (limits.sendLimit && (isNaN(limits.sendLimit) || limits.sendLimit < 0)) {
      throw new Error('Send limit must be a positive number')
    }
    if (limits.withdrawLimit && (isNaN(limits.withdrawLimit) || limits.withdrawLimit < 0)) {
      throw new Error('Withdraw limit must be a positive number')
    }
    return true
  }

  const handleUpdateUserLimits = async (userId: string, limits: any) => {
    try {
      validateLimits(limits)
      await handleUserAction(userId, 'update-limits', limits)
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'Invalid input',
        variant: 'destructive',
      })
    }
  }

  const handleBlockUser = async (userId: string, reason: string) => {
    await handleUserAction(userId, 'block', { reason })
  }

  if (users === undefined) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load users. Please try again later.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <CreateUserForm onClose={() => {
              setIsDialogOpen(false)
              fetchUsers() // Refresh the list after creating a new user
            }} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ) : users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.role}
                    onValueChange={async (newRole) => {
                      try {
                        await updateRole(user.id, newRole as 'admin' | 'user')
                        toast({
                          title: "Success",
                          description: "User role updated successfully",
                        })
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update user role",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.status}
                    onValueChange={async (newStatus) => {
                      await handleUserAction(user.id, 'update-status', { status: newStatus })
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <p className="mt-1">{selectedUser.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="mt-1">{selectedUser.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <p className="mt-1">{selectedUser.role}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Created At</label>
                <p className="mt-1">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
              {selectedUser.metadata && (
                <>
                  <div>
                    <label className="text-sm font-medium">Balance</label>
                    <p className="mt-1">{selectedUser.metadata.balance || 0} ETB</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Send Limit</label>
                    <p className="mt-1">{selectedUser.metadata.send_limit || 'No limit'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Withdraw Limit</label>
                    <p className="mt-1">{selectedUser.metadata.withdraw_limit || 'No limit'}</p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">KYC Documents</label>
                {selectedUser.metadata?.id_card_url ? (
                  <>
                    <img 
                      src={selectedUser.metadata.id_card_url} 
                      alt="ID Card" 
                      className="max-w-md rounded"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleUserAction(selectedUser.id, 'verify-kyc', { status: 'verified' })}>
                        Approve KYC
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Reject KYC</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject KYC Verification</AlertDialogTitle>
                            <Input
                              placeholder="Enter rejection reason"
                              value={kycRejectionReason}
                              onChange={(e) => setKycRejectionReason(e.target.value)}
                            />
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                              if (!kycRejectionReason.trim()) {
                                toast({
                                  title: "Error",
                                  description: "Please provide a rejection reason",
                                  variant: "destructive",
                                })
                                return
                              }
                              handleUserAction(selectedUser.id, 'verify-kyc', {
                                status: 'rejected',
                                reason: kycRejectionReason.trim()
                              })
                              setKycRejectionReason('')
                            }}>
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No KYC documents uploaded</p>
                )}
              </div>

              <div className="pt-4 space-y-4">
                <h3 className="font-medium">Actions</h3>
                
                <Dialog open={isLimitsDialogOpen} onOpenChange={setIsLimitsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      Update Limits
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update User Limits</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Send Limit</label>
                        <Input
                          type="number"
                          value={limitsForm.sendLimit}
                          onChange={(e) => setLimitsForm({ ...limitsForm, sendLimit: e.target.value })}
                          placeholder="Leave empty for no limit"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Withdraw Limit</label>
                        <Input
                          type="number"
                          value={limitsForm.withdrawLimit}
                          onChange={(e) => setLimitsForm({ ...limitsForm, withdrawLimit: e.target.value })}
                          placeholder="Leave empty for no limit"
                        />
                      </div>
                      <Button onClick={() => {
                        handleUpdateUserLimits(selectedUser.id, {
                          send_limit: limitsForm.sendLimit ? Number(limitsForm.sendLimit) : null,
                          withdraw_limit: limitsForm.withdrawLimit ? Number(limitsForm.withdrawLimit) : null
                        })
                        setIsLimitsDialogOpen(false)
                      }}>
                        Update
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      Update Balance
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update User Balance</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">New Balance</label>
                        <Input
                          type="number"
                          value={balanceForm.amount}
                          onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                          placeholder="Enter new balance"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Note</label>
                        <Input
                          value={balanceForm.note}
                          onChange={(e) => setBalanceForm({ ...balanceForm, note: e.target.value })}
                          placeholder="Enter reason for adjustment"
                        />
                      </div>
                      <Button 
                        onClick={() => {
                          if (!balanceForm.amount || isNaN(Number(balanceForm.amount))) {
                            toast({
                              title: "Error",
                              description: "Please enter a valid balance amount",
                              variant: "destructive",
                            })
                            return
                          }
                          if (!balanceForm.note.trim()) {
                            toast({
                              title: "Error",
                              description: "Please provide a note for this adjustment",
                              variant: "destructive",
                            })
                            return
                          }
                          handleBalanceUpdate(balanceForm.amount, balanceForm.note)
                          setIsBalanceDialogOpen(false)
                          setBalanceForm({ amount: '', note: '' })
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => handleUserAction(selectedUser.id, 'verify-kyc')}
                >
                  Verify KYC
                </Button>

                {selectedUser.status !== 'blocked' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full">
                        Block User
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Block User</AlertDialogTitle>
                        <AlertDialogDescription>
                          <Input
                            placeholder="Enter reason for blocking"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                          />
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleBlockUser(selectedUser.id, blockReason)}>
                          Block
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleUserAction(selectedUser.id, 'unblock')}
                  >
                    Unblock User
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => handleUserAction(selectedUser.id, 'reset-password')}
                >
                  Reset Password
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full">
                      Delete User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the user account
                        and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
                              method: 'DELETE',
                            })
                            
                            if (!response.ok) {
                              const error = await response.json()
                              throw new Error(error.error || 'Failed to delete user')
                            }
                            
                            toast({
                              title: "Success",
                              description: "User deleted successfully",
                            })
                            setSelectedUser(null)
                            fetchUsers()
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: error instanceof Error ? error.message : "Failed to delete user",
                              variant: "destructive",
                            })
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CreateUserFormProps {
  onClose: () => void;
}

function CreateUserForm({ onClose }: CreateUserFormProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const userData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      username: formData.get('username'),
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      if (!response.ok) throw new Error('Failed to create user')

      toast({
        title: "Success",
        description: "User created successfully",
      })
      onClose()
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
          First Name
        </label>
        <Input id="firstName" name="firstName" required />
      </div>
      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
          Last Name
        </label>
        <Input id="lastName" name="lastName" required />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <Input id="username" name="username" required />
      </div>
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  )
}
