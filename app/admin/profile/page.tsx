"use client"
// Backend Integration: This entire page needs to be integrated with the backend API.
// It should fetch real admin profile data, and update profile data when the form is submitted.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

// Mock admin data
const mockAdminData = {
  name: "Admin User",
  email: "admin@cashora.com",
  role: "Super Admin",
  lastLogin: "2023-07-05 14:30",
}

export default function AdminProfilePage() {
  const [adminData, setAdminData] = useState(mockAdminData)
  const [isEditing, setIsEditing] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setAdminData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Backend Integration: Send updated `adminData` to backend API to update the admin profile
      console.log("Updated admin data:", adminData)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={adminData.name} onChange={handleInputChange} disabled={!isEditing} />
            </div>
              {/* Backend Integration: Data for email is fetched from the backend API. */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={adminData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
              {/* Backend Integration: Data for role is fetched from the backend API. */}
            <div>
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={adminData.role} disabled />
            </div>
              {/* Backend Integration: Data for Last login is fetched from the backend API. */}
            <div>
              <Label htmlFor="lastLogin">Last Login</Label>
              <Input id="lastLogin" value={adminData.lastLogin} disabled />
            </div>
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
    </div>
  )
}

