"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    dateOfBirth: "",
    placeOfBirth: "",
    residence: "",
    nationality: "",
    idCard: null as File | null,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLInputElement>) => {
    const { name, value, files } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate registration API call
    console.log("Sign up with:", formData)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500 py-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Create a Cashora Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid w-full items-center gap-4">
                {[
                  { name: "firstName", label: "First Name", type: "text" },
                  { name: "lastName", label: "Last Name", type: "text" },
                  { name: "username", label: "Username", type: "text" },
                  { name: "email", label: "Email", type: "email" },
                  { name: "dateOfBirth", label: "Date of Birth", type: "date" },
                  { name: "placeOfBirth", label: "Place of Birth", type: "text" },
                  { name: "residence", label: "Residence", type: "text" },
                  { name: "nationality", label: "Nationality", type: "text" },
                ].map((field) => (
                  <div key={field.name} className="flex flex-col space-y-1.5">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      value={formData[field.name as keyof typeof formData] as string}
                      onChange={handleChange}
                      required
                    />
                  </div>
                ))}
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="idCard">ID Card Upload</Label>
                  <Input id="idCard" name="idCard" type="file" onChange={handleChange} required />
                </div>
              </div>
              <Button className="w-full mt-6" type="submit">
                Sign Up
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-2">
              New accounts will be set to "pending" and require admin approval.
            </p>
            <Link href="/signin" className="text-sm text-blue-600 hover:underline">
              Already have an account? Sign in here
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

