"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

// Mock banks data
const mockBanks = [
  { id: 1, name: "Bank A" },
  { id: 2, name: "Bank B" },
  { id: 3, name: "Bank C" },
]

// Mock users data
const mockUsers = [
  { id: 1, username: "johndoe", email: "john@example.com" },
  { id: 2, username: "janesmith", email: "jane@example.com" },
  { id: 3, username: "bobjonson", email: "bob@example.com" },
]

// Mock user-bank assignments
const mockUserBanks = [
  { userId: 1, bankId: 1 },
  { userId: 2, bankId: 2 },
]

export default function BanksManagement() {
  const [banks, setBanks] = useState(mockBanks)
  const [users, setUsers] = useState(mockUsers)
  const [userBanks, setUserBanks] = useState(mockUserBanks)
  const [isAddBankDialogOpen, setIsAddBankDialogOpen] = useState(false)
  const [isAssignBankDialogOpen, setIsAssignBankDialogOpen] = useState(false)
  const [selectedBank, setSelectedBank] = useState<(typeof mockBanks)[0] | null>(null)

  const handleAddBank = (bankName: string) => {
    // TODO: Integrate with backend API to add new bank
    const newBank = {
      id: banks.length + 1,
      name: bankName,
    }
    setBanks([...banks, newBank])
    setIsAddBankDialogOpen(false)
  }

  const handleEditBank = (bankId: number, newName: string) => {
    // TODO: Integrate with backend API to edit bank
    setBanks(banks.map((bank) => (bank.id === bankId ? { ...bank, name: newName } : bank)))
  }

  const handleAssignBank = (bankId: number, userIds: number[]) => {
    // TODO: Integrate with backend API to assign bank to users
    const newAssignments = userIds.map((userId) => ({ userId, bankId }))
    setUserBanks([...userBanks.filter((ub) => ub.bankId !== bankId), ...newAssignments])
    setIsAssignBankDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Banks Management</h1>
        <Dialog open={isAddBankDialogOpen} onOpenChange={setIsAddBankDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Bank</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Bank</DialogTitle>
            </DialogHeader>
            <AddBankForm onSubmit={handleAddBank} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Banks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell>{bank.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBank(bank)
                        setIsAssignBankDialogOpen(true)
                      }}
                    >
                      Assign to Users
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAssignBankDialogOpen} onOpenChange={setIsAssignBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Bank to Users</DialogTitle>
          </DialogHeader>
          {selectedBank && (
            <AssignBankForm bank={selectedBank} users={users} userBanks={userBanks} onSubmit={handleAssignBank} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddBankForm({ onSubmit }: { onSubmit: (bankName: string) => void }) {
  const [bankName, setBankName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(bankName)
    setBankName("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="bankName">Bank Name</Label>
        <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
      </div>
      <Button type="submit">Add Bank</Button>
    </form>
  )
}

function AssignBankForm({
  bank,
  users,
  userBanks,
  onSubmit,
}: {
  bank: (typeof mockBanks)[0]
  users: typeof mockUsers
  userBanks: typeof mockUserBanks
  onSubmit: (bankId: number, userIds: number[]) => void
}) {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(bank.id, selectedUsers)
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map((user) => user.id))
    }
  }

  const handleSelectUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Assigning Bank: {bank.name}</Label>
      </div>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="selectAll" checked={selectedUsers.length === users.length} onCheckedChange={handleSelectAll} />
          <label htmlFor="selectAll">Select All Users</label>
        </div>
        {users.map((user) => (
          <div key={user.id} className="flex items-center space-x-2">
            <Checkbox
              id={`user-${user.id}`}
              checked={selectedUsers.includes(user.id)}
              onCheckedChange={() => handleSelectUser(user.id)}
            />
            <label htmlFor={`user-${user.id}`}>{user.username}</label>
          </div>
        ))}
      </div>
      <Button type="submit">Assign Bank to Selected Users</Button>
    </form>
  )
}

