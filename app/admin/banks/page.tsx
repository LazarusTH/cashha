"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Bank, BankUser } from "@/lib/supabase/banks"

export default function BanksManagement() {
  const [banks, setBanks] = useState<Bank[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [userBanks, setUserBanks] = useState<BankUser[]>([])
  const [isAddBankDialogOpen, setIsAddBankDialogOpen] = useState(false)
  const [isAssignBankDialogOpen, setIsAssignBankDialogOpen] = useState(false)
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [banksResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/banks'),
        fetch('/api/admin/users')
      ])

      if (!banksResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [banksData, usersData] = await Promise.all([
        banksResponse.json(),
        usersResponse.json()
      ])

      setBanks(banksData.banks)
      setUsers(usersData.users)

      // Fetch bank-user assignments
      const bankUsersResponse = await fetch('/api/admin/banks/users')
      if (!bankUsersResponse.ok) {
        throw new Error('Failed to fetch bank users')
      }
      const bankUsersData = await bankUsersResponse.json()
      setUserBanks(bankUsersData.bankUsers)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBank = async (bankName: string) => {
    try {
      const response = await fetch('/api/admin/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: bankName }),
      })

      if (!response.ok) {
        throw new Error('Failed to add bank')
      }

      const data = await response.json()
      setBanks([...banks, data.bank])
      setIsAddBankDialogOpen(false)
      toast({
        title: "Success",
        description: "Bank added successfully",
      })
    } catch (err) {
      console.error('Error adding bank:', err)
      toast({
        title: "Error",
        description: "Failed to add bank",
        variant: "destructive",
      })
    }
  }

  const handleEditBank = async (bankId: string, newName: string) => {
    try {
      const response = await fetch(`/api/admin/banks/${bankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })

      if (!response.ok) {
        throw new Error('Failed to update bank')
      }

      const data = await response.json()
      setBanks(banks.map((bank) => (bank.id === bankId ? data.bank : bank)))
      toast({
        title: "Success",
        description: "Bank updated successfully",
      })
    } catch (err) {
      console.error('Error updating bank:', err)
      toast({
        title: "Error",
        description: "Failed to update bank",
        variant: "destructive",
      })
    }
  }

  const handleAssignBank = async (bankId: string, userIds: string[]) => {
    try {
      const response = await fetch(`/api/admin/banks/${bankId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign users to bank')
      }

      const data = await response.json()
      setUserBanks(data.bankUsers)
      setIsAssignBankDialogOpen(false)
      toast({
        title: "Success",
        description: "Users assigned to bank successfully",
      })
    } catch (err) {
      console.error('Error assigning users to bank:', err)
      toast({
        title: "Error",
        description: "Failed to assign users to bank",
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
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : banks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell>{bank.name}</TableCell>
                  <TableCell>{bank.status}</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBank(bank)
                        setIsAssignBankDialogOpen(true)
                      }}
                    >
                      Assign Users
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBank(bank.id, bank.name)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedBank && (
        <Dialog open={isAssignBankDialogOpen} onOpenChange={setIsAssignBankDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Users to {selectedBank.name}</DialogTitle>
            </DialogHeader>
            <AssignBankForm
              bank={selectedBank}
              users={users}
              userBanks={userBanks}
              onSubmit={handleAssignBank}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function AddBankForm({ onSubmit }: { onSubmit: (bankName: string) => void }) {
  const [bankName, setBankName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (bankName.trim()) {
      onSubmit(bankName.trim())
      setBankName("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="bankName">Bank Name</Label>
        <Input
          id="bankName"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          required
        />
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
  bank: Bank
  users: any[]
  userBanks: BankUser[]
  onSubmit: (bankId: string, userIds: string[]) => void
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    // Pre-select users already assigned to this bank
    const assignedUsers = userBanks
      .filter((ub) => ub.bank_id === bank.id)
      .map((ub) => ub.user_id)
    setSelectedUsers(assignedUsers)
  }, [bank.id, userBanks])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(bank.id, selectedUsers)
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center space-x-2">
            <Checkbox
              id={`user-${user.id}`}
              checked={selectedUsers.includes(user.id)}
              onCheckedChange={() => toggleUser(user.id)}
            />
            <Label htmlFor={`user-${user.id}`}>
              {user.full_name} ({user.email})
            </Label>
          </div>
        ))}
      </div>
      <Button type="submit">Save Assignments</Button>
    </form>
  )
}
