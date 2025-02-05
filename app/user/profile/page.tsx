"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock user data
const userData = {
  fullName: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  phoneNumber: "+1234567890",
  dateOfBirth: "1990-01-01",
  address: "123 Main St, City, Country",
  balance: 5000,
}

// Mock recent activities
const recentActivities = [
  { id: 1, type: "Deposit", amount: 1000, date: "2023-07-03" },
  { id: 2, type: "Withdrawal", amount: -500, date: "2023-07-02" },
  { id: 3, type: "Send", amount: -200, date: "2023-07-01" },
]

export default function ProfilePage() {
  const [user, setUser] = useState(userData)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    // TODO: Fetch user data from backend
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUser((prevUser) => ({ ...prevUser, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with backend API to update user profile
    console.log("Updated user data:", user)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {Object.entries(user).map(([key, value]) => (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium text-gray-700">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                <Input
                  id={key}
                  name={key}
                  value={value}
                  onChange={handleInputChange}
                  disabled={!isEditing || key === "balance"}
                />
              </div>
            ))}
            {isEditing ? (
              <Button type="submit">Save Changes</Button>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount (ETB)</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{activity.type}</TableCell>
                  <TableCell>{activity.amount}</TableCell>
                  <TableCell>{activity.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

