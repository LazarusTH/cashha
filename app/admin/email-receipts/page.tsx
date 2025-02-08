"use client"
// Backend Integration: This page is integrated with the backend API to manage email receipts.

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface User {
  id: number
  username: string
  email: string
  last_receipt_sent?: string
}

export default function EmailReceiptModule() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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

  const handleSendEmails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUsers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one recipient',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/admin/email/send-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: selectedUsers,
          subject,
          message,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send receipts')
      }

      toast({
        title: 'Success',
        description: 'Receipts sent successfully',
      })

      // Reset form and refresh user list to update last_receipt_sent
      setSelectedUsers([])
      setSubject('')
      setMessage('')
      fetchUsers()
    } catch (error) {
      console.error('Error sending receipts:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send receipts',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div>Loading users...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Receipt Module</h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Checkbox
              id="selectAll"
              checked={selectedUsers.length === users.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="selectAll" className="ml-2">
              Select All
            </label>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Select</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Receipt Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.last_receipt_sent 
                      ? new Date(user.last_receipt_sent).toLocaleString()
                      : 'Never'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compose Receipt Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendEmails} className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={sending}
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="min-h-[200px]"
                disabled={sending}
              />
            </div>
            <Button type="submit" disabled={selectedUsers.length === 0 || sending}>
              {sending ? 'Sending...' : 'Send Receipt Emails'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
