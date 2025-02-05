"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock user data
const mockUsers = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    username: "johndoe",
    email: "john@example.com",
    dateOfBirth: "1990-01-01",
    placeOfBirth: "New York",
    residence: "New York",
    nationality: "USA",
    status: "Active",
    balance: 1000,
    sendLimit: 5000,
    withdrawLimit: 10000,
    idCard: "/johndoe.jpg", // Added ID card path
    role: "user",
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
    username: "janesmith",
    email: "jane@example.com",
    dateOfBirth: "1992-05-15",
    placeOfBirth: "London",
    residence: "London",
    nationality: "UK",
    status: "Pending",
    balance: 500,
    sendLimit: null,
    withdrawLimit: null,
    idCard: "/janesmith.jpg", // Added ID card path
    role: "user",
  },
]

export default function UsersManagement() {
  const [users, setUsers] = useState(mockUsers)
  const [pendingUsers, setPendingUsers] = useState(mockUsers.filter((user) => user.status === "Pending"))
  const [selectedUser, setSelectedUser] = useState<(typeof mockUsers)[0] | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isUserDetailDialogOpen, setIsUserDetailDialogOpen] = useState(false)

  const handleCreateUser = (
    userData: Omit<(typeof mockUsers)[0], "id" | "balance" | "status" | "idCard"> & { idCard: File | null },
  ) => {
    // TODO: Integrate with backend API to create new user
    const newUser = {
      ...userData,
      id: users.length + 1,
      balance: 0,
      status: "Pending",
      sendLimit: null,
      withdrawLimit: null,
    }
    setUsers([...users, newUser])
    setPendingUsers([...pendingUsers, newUser])
    setIsCreateDialogOpen(false)
  }

  const handleApproveUser = (userId: number) => {
    // TODO: Integrate with backend API to approve user
    setUsers(users.map((user) => (user.id === userId ? { ...user, status: "Active" } : user)))
    setPendingUsers(pendingUsers.filter((user) => user.id !== userId))
    setIsDetailDialogOpen(false)
    // TODO: Send email notification
    console.log(`Approved user ${userId}`)
  }

  const handleRejectUser = (userId: number, reason: string) => {
    // TODO: Integrate with backend API to reject user
    setUsers(users.map((user) => (user.id === userId ? { ...user, status: "Rejected" } : user)))
    setPendingUsers(pendingUsers.filter((user) => user.id !== userId))
    setIsDetailDialogOpen(false)
    // TODO: Send email notification with rejection reason
    console.log(`Rejected user ${userId} with reason: ${reason}`)
    setRejectionReason("")
  }

  const handleUpdateUserBalance = (userId: number, amount: number) => {
    // TODO: Integrate with backend API to update user balance
    setUsers(users.map((user) => (user.id === userId ? { ...user, balance: user.balance + amount } : user)))
  }

  const handleUpdateUserLimits = (userId: number, type: "send" | "withdraw", limit: number | null) => {
    // TODO: Integrate with backend API to update user limits
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, [type === "send" ? "sendLimit" : "withdrawLimit"]: limit } : user,
      ),
    )
  }

  const handleDeleteUser = (userId: number) => {
    // TODO: Integrate with backend API to delete user
    setUsers(users.filter((user) => user.id !== userId))
    setPendingUsers(pendingUsers.filter((user) => user.id !== userId))
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
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.status}</TableCell>
                  <TableCell>{user.balance} ETB</TableCell>
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
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.username}</TableCell>
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
                onUpdateBalance={handleUpdateUserBalance}
                onUpdateLimits={handleUpdateUserLimits}
                onDelete={handleDeleteUser}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateUserForm({ onSubmit }: { onSubmit: (userData: any) => void }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    dateOfBirth: "",
    placeOfBirth: "",
    residence: "",
    nationality: "",
    role: "user",
    idCard: null,
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit({ ...formData, idCard: formData.idCard })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.type === "file") {
      setFormData({ ...formData, [e.target.name]: e.target.files![0] })
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value })
    }
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" value={formData.username} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="placeOfBirth">Place of Birth</Label>
          <Input id="placeOfBirth" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="residence">Residence</Label>
          <Input id="residence" name="residence" value={formData.residence} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" name="nationality" value={formData.nationality} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select
            name="role"
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}
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
          <Label htmlFor="idCardUpload">ID Card Upload</Label>
          <Input id="idCardUpload" name="idCard" type="file" onChange={handleChange} />
        </div>
        <Button type="submit">Create User</Button>
      </form>
    </ScrollArea>
  )
}

type Props = {
  user: (typeof mockUsers)[0]
  onApprove: (userId: number) => void
  onReject: (userId: number, reason: string) => void
  onUpdateBalance: (userId: number, amount: number) => void
  onUpdateLimits: (userId: number, type: "send" | "withdraw", limit: any) => void
  onDelete: (userId: number) => void
}

function UserDetailForm({ user, onApprove, onReject, onUpdateLimits }: Props) {
  const [limits, setLimits] = useState({
    send: {
      type: user.sendLimit ? "custom" : "none", // none, daily, weekly, monthly, yearly, custom
      value: user.sendLimit?.toString() || "",
      customDays: "",
    },
    withdraw: {
      type: user.withdrawLimit ? "custom" : "none",
      value: user.withdrawLimit?.toString() || "",
      customDays: "",
    },
  })
  const [rejectionReason, setRejectionReason] = useState("")

  const handleLimitChange = (operation: "send" | "withdraw", type: string) => {
    setLimits((prev) => ({
      ...prev,
      [operation]: { ...prev[operation], type },
    }))
  }

  const handleLimitValueChange = (operation: "send" | "withdraw", value: string) => {
    setLimits((prev) => ({
      ...prev,
      [operation]: { ...prev[operation], value },
    }))
  }

  const handleCustomDaysChange = (operation: "send" | "withdraw", value: string) => {
    setLimits((prev) => ({
      ...prev,
      [operation]: { ...prev[operation], customDays: value },
    }))
  }

  const handleSaveLimits = () => {
    onUpdateLimits(user.id, "send", limits.send.type === "none" ? null : limits.send.value)
    onUpdateLimits(user.id, "withdraw", limits.withdraw.type === "none" ? null : limits.withdraw.value)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <p>{`${user.firstName} ${user.lastName}`}</p>
      </div>
      <div>
        <Label>Username</Label>
        <p>{user.username}</p>
      </div>
      <div>
        <Label>Email</Label>
        <p>{user.email}</p>
      </div>
      <div>
        <Label>Date of Birth</Label>
        <p>{user.dateOfBirth}</p>
      </div>
      <div>
        <Label>Place of Birth</Label>
        <p>{user.placeOfBirth}</p>
      </div>
      <div>
        <Label>Residence</Label>
        <p>{user.residence}</p>
      </div>
      <div>
        <Label>Nationality</Label>
        <p>{user.nationality}</p>
      </div>
      <div>
        <Label>Role</Label>
        <p>{user.role}</p>
      </div>
      {user.status !== "Pending" && (
        <div>
          <Label>Current Balance</Label>
          <p>{user.balance} ETB</p>
        </div>
      )}
      <div>
        <Label>ID Card</Label>
        <div className="mt-2 border rounded-lg p-2">
          <Image
            src={user.idCard || "/placeholder.svg"}
            alt="ID Card"
            width={300}
            height={200}
            className="rounded-md"
          />
        </div>
      </div>
      <div className="space-y-4">
        {["send", "withdraw"].map((operation) => (
          <div key={operation} className="space-y-2">
            <Label>{operation === "send" ? "Send Limit" : "Withdraw Limit"}</Label>
            <Select
              value={limits[operation as "send" | "withdraw"].type}
              onValueChange={(value) => handleLimitChange(operation as "send" | "withdraw", value)}
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
            {limits[operation as "send" | "withdraw"].type !== "none" && (
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Enter limit amount"
                  value={limits[operation as "send" | "withdraw"].value}
                  onChange={(e) => handleLimitValueChange(operation as "send" | "withdraw", e.target.value)}
                />
                {limits[operation as "send" | "withdraw"].type === "custom" && (
                  <Input
                    type="number"
                    placeholder="Enter number of days"
                    value={limits[operation as "send" | "withdraw"].customDays}
                    onChange={(e) => handleCustomDaysChange(operation as "send" | "withdraw", e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        <Button onClick={handleSaveLimits}>Save Limits</Button>
      </div>
      {user.status === "Pending" && (
        <>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Button onClick={() => onApprove(user.id)}>Approve User</Button>
              <Button variant="destructive" onClick={() => onReject(user.id, rejectionReason)}>
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
    </div>
  )
}

