"use client"

// Backend Integration: This page is integrated with the backend API to manage email sending.

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

interface User {
  id: number
  username: string
  email: string
}

export default function EmailModulePage() {
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

  const handleSendEmail = async (e: React.FormEvent) => {
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
      const response = await fetch('/api/admin/email/send', {
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
        throw new Error(data.error || 'Failed to send email')
      }

      toast({
        title: 'Success',
        description: 'Email sent successfully',
      })

      // Reset form
      setSelectedUsers([])
      setSubject('')
      setMessage('')
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email',
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
      <h1 className="text-2xl font-bold">Email Module</h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selectAll"
                checked={selectedUsers.length === users.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="selectAll">Select All Users</Label>
            </div>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => handleSelectUser(user.id)}
                  />
                  <Label htmlFor={`user-${user.id}`}>
                    {user.username} ({user.email})
                  </Label>
                </div>
              ))}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compose Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendEmail} className="space-y-4">
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
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
