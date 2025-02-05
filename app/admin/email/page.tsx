"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock users data
const mockUsers = [
  { id: 1, username: "johndoe", email: "john@example.com" },
  { id: 2, username: "janesmith", email: "jane@example.com" },
  // Add more users...
]

export default function EmailModulePage() {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const handleSelectAll = () => {
    if (selectedUsers.length === mockUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(mockUsers.map((user) => user.id))
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
                checked={selectedUsers.length === mockUsers.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="selectAll">Select All Users</Label>
            </div>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              {mockUsers.map((user) => (
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
          <form className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="min-h-[200px]"
              />
            </div>
            <Button type="submit" disabled={selectedUsers.length === 0}>
              Send Email
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

