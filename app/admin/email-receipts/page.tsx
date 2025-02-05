"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock users data
const mockUsers = [
  { id: 1, username: "johndoe", email: "john@example.com" },
  { id: 2, username: "janesmith", email: "jane@example.com" },
  { id: 3, username: "bobjonson", email: "bob@example.com" },
]

export default function EmailReceiptModule() {
  const [users, setUsers] = useState(mockUsers)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

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

  const handleSendEmails = () => {
    // TODO: Integrate with backend API to send emails
    console.log("Sending emails to:", selectedUsers)
    console.log("Subject:", subject)
    console.log("Message:", message)
    // Reset form
    setSelectedUsers([])
    setSubject("")
    setMessage("")
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compose Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendEmails()
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>
            <Button type="submit" disabled={selectedUsers.length === 0}>
              Send Emails
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

