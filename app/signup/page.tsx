"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signUp } from "@/lib/supabase/client"
import { createProfile } from "@/lib/supabase/profile"
import { useFormValidation } from "@/lib/hooks/use-form-validation"
import { toast } from "@/components/ui/use-toast"
import { validateFileUpload } from "@/lib/utils/validation"

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
    nationality: "",
    address: "",
    acceptTerms: false,
    referralCode: "",
  })
  const [loading, setLoading] = useState(false)
  const [verifyingEmail, setVerifyingEmail] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<{
    idCard?: File
    proofOfAddress?: File
  }>({})
  const router = useRouter()
  const { 
    errors, 
    validateEmail, 
    validatePassword, 
    validateName, 
    validateAddress,
    clearErrors 
  } = useFormValidation()

  useEffect(() => {
    // Check if email is already registered
    const checkEmail = async () => {
      if (!formData.email || !validateEmail(formData.email)) return

      try {
        const response = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        })
        const data = await response.json()

        if (data.exists) {
          toast({
            title: "Error",
            description: "This email is already registered",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error checking email:', error)
      }
    }

    const debounceTimer = setTimeout(checkEmail, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.email])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'idCard' | 'proofOfAddress') => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValid = validateFileUpload(file)
    if (!isValid) return

    setUploadedFiles(prev => ({
      ...prev,
      [type]: file
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    // Validate all inputs
    const isEmailValid = validateEmail(formData.email)
    const isPasswordValid = validatePassword(formData.password)
    const isFirstNameValid = validateName(formData.firstName, 'firstName')
    const isLastNameValid = validateName(formData.lastName, 'lastName')
    const isAddressValid = validateAddress(formData.address)

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (!formData.acceptTerms) {
      toast({
        title: "Error",
        description: "You must accept the terms and conditions",
        variant: "destructive",
      })
      return
    }

    if (!isEmailValid || !isPasswordValid || !isFirstNameValid || 
        !isLastNameValid || !isAddressValid) {
      return
    }

    // Validate required document uploads
    if (!uploadedFiles.idCard || !uploadedFiles.proofOfAddress) {
      toast({
        title: "Error",
        description: "Please upload all required documents",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Upload documents first
      const uploadPromises = []
      for (const [key, file] of Object.entries(uploadedFiles)) {
        if (!file) continue

        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', key)
        
        uploadPromises.push(
          fetch('/api/upload/kyc-document', {
            method: 'POST',
            body: formData,
          }).then(res => res.json())
        )
      }

      const uploadResults = await Promise.all(uploadPromises)
      const documentUrls = uploadResults.reduce((acc, { url, type }) => ({
        ...acc,
        [type]: url
      }), {})

      // Sign up the user
      const { data, error } = await signUp(formData.email, formData.password)
      if (error) throw error

      // Create user profile with all collected information
      if (!data || !data.user) {
        throw new Error('Failed to create user account')
      }

      await createProfile({
        id: data.user.id,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        address: formData.address,
        role: 'user',
        idCardUrl: documentUrls.idCard,
        proofOfAddressUrl: documentUrls.proofOfAddress,
        referralCode: formData.referralCode,
        status: 'pending_verification',
        createdAt: new Date().toISOString(),
      })

      // Process referral if provided
      if (formData.referralCode) {
        await fetch('/api/referrals/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode: formData.referralCode,
            newUserId: data.user.id,
          }),
        })
      }

      // Send welcome email
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.email,
          template: 'welcome',
          data: {
            name: `${formData.firstName} ${formData.lastName}`,
          },
        }),
      })

      // Notify admin of new registration
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_user',
          message: `New user registration: ${formData.email}`,
          data: {
            userId: data.user.id,
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`,
          },
        }),
      })
    } catch (error) {
      console.error('Sign up error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (verifyingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Verify Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">
              We've sent a verification email to <strong>{formData.email}</strong>.
              Please check your inbox and follow the instructions to verify your account.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500 py-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Create a Cashora Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.phoneNumber && <p className="text-sm text-red-500">{errors.phoneNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.dateOfBirth && <p className="text-sm text-red-500">{errors.dateOfBirth}</p>}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.nationality && <p className="text-sm text-red-500">{errors.nationality}</p>}
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="idCard">ID Card (Required)</Label>
                <Input
                  id="idCard"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileUpload(e, 'idCard')}
                  disabled={loading}
                />
                {errors.idCard && <p className="text-sm text-red-500">{errors.idCard}</p>}
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="proofOfAddress">Proof of Address (Required)</Label>
                <Input
                  id="proofOfAddress"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileUpload(e, 'proofOfAddress')}
                  disabled={loading}
                />
                {errors.proofOfAddress && <p className="text-sm text-red-500">{errors.proofOfAddress}</p>}
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                  disabled={loading}
                />
                <Label htmlFor="acceptTerms">
                  I accept the{" "}
                  <Link href="/terms" className="text-blue-500 hover:underline">
                    terms and conditions
                  </Link>
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm">
              Already have an account?{" "}
              <Link href="/signin" className="text-blue-500 hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
