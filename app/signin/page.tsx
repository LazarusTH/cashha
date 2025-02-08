"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "@/lib/supabase/client"
import { useFormValidation } from "@/lib/hooks/use-form-validation"
import { toast } from "@/components/ui/use-toast"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockExpiry, setBlockExpiry] = useState<Date | null>(null)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const router = useRouter()
  const { errors, validateEmail, validatePassword, validateTwoFactorCode, clearErrors } = useFormValidation()

  useEffect(() => {
    // Check if user is blocked
    const checkBlockStatus = async () => {
      try {
        const response = await fetch('/api/auth/block-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })
        const data = await response.json()
        
        if (data.blocked) {
          setIsBlocked(true)
          setBlockExpiry(new Date(data.blockExpiry))
        }
      } catch (error) {
        console.error('Error checking block status:', error)
      }
    }

    if (email) {
      checkBlockStatus()
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    // Check if blocked
    if (isBlocked && blockExpiry && blockExpiry > new Date()) {
      toast({
        title: "Error",
        description: `Account is temporarily blocked. Please try again after ${blockExpiry.toLocaleString()}`,
        variant: "destructive",
      })
      return
    }

    // Validate inputs
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)
    
    if (!isEmailValid || !isPasswordValid) {
      return
    }

    if (showTwoFactor) {
      const isTwoFactorValid = validateTwoFactorCode(twoFactorCode)
      if (!isTwoFactorValid) {
        return
      }
    }

    setLoading(true)
    try {
      // First, verify if 2FA is required
      if (!showTwoFactor) {
        const { data: twoFactorData } = await fetch('/api/auth/check-2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }).then(res => res.json())

        if (twoFactorData.required) {
          setShowTwoFactor(true)
          setLoading(false)
          return
        }
      }

      // Attempt login
      const { data, error } = await signIn(
        email, 
        password, 
        showTwoFactor ? twoFactorCode : undefined
      )
      
      if (error) {
        setLoginAttempts(prev => prev + 1)
        
        // Check if we should block the account
        if (loginAttempts + 1 >= 5) {
          const blockDuration = 30 * 60 * 1000 // 30 minutes
          const expiry = new Date(Date.now() + blockDuration)
          
          await fetch('/api/auth/block-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              blockExpiry: expiry.toISOString(),
            }),
          })
          
          setIsBlocked(true)
          setBlockExpiry(expiry)
          
          throw new Error(`Too many failed attempts. Account is blocked until ${expiry.toLocaleString()}`)
        }
        
        throw error
      }

      // Reset login attempts on successful login
      setLoginAttempts(0)
      setIsBlocked(false)
      setBlockExpiry(null)

      // Log the successful login
      await fetch('/api/auth/log-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.user?.id,
          email,
          ip: window.clientInformation?.userAgent,
          timestamp: new Date().toISOString(),
        }),
      })

      toast({
        title: "Success",
        description: "Successfully signed in!",
      })

      // Redirect based on user role and verification status
      const role = data.user?.user_metadata?.role || 'user'
      const isVerified = data.user?.email_confirmed_at != null

      if (!isVerified) {
        router.push('/verify-email')
      } else if (role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/user/dashboard')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Login to Cashora</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || showTwoFactor}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || showTwoFactor}
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                </div>

                {showTwoFactor && (
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="twoFactorCode">Two-Factor Code</Label>
                    <Input
                      id="twoFactorCode"
                      type="text"
                      placeholder="Enter 2FA code"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      disabled={loading}
                    />
                    {errors.twoFactorCode && (
                      <p className="text-sm text-red-500">{errors.twoFactorCode}</p>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={loading || (isBlocked && blockExpiry && blockExpiry > new Date())}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                {isBlocked && blockExpiry && (
                  <p className="text-sm text-red-500 text-center">
                    Account is blocked until {blockExpiry.toLocaleString()}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center">
              <Link href="/forgot-password" className="text-blue-500 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="text-sm text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-500 hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
