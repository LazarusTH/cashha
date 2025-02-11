"use client";

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/layout"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router"

const { toast } = useToast();
export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)
        const session = await supabase.auth.getSession()
        if (!session.data.session) {
          router.push('/signin')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_verified, is_blocked')
          .eq('id', session.data.session.user.id)
          .single()

        if (profileError || !profile) {
          throw new Error('Failed to fetch user profile')
        }

        if (profile.is_blocked) {
          toast({
            title: 'Account Blocked',
            description: 'Your account has been blocked. Please contact support.',
            variant: 'destructive',
          })
          router.push('/signin')
          return
        }

        if (!profile.is_verified) {
          toast({
            title: 'Account Not Verified',
            description: 'Please verify your email address to continue.',
            variant: 'destructive',
          })
          router.push('/verify-email')
          return
        }
      } catch (err) {
        console.error('Session check error:', err)
        setError(err instanceof Error ? err : new Error('An unknown error occurred'))
        router.push('/signin')
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/signin')
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-destructive/10 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p className="text-destructive">{error.message}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/signin')}
          >
            Return to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
