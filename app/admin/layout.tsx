"use client";

import AdminSidebar from "@/components/admin/AdminSidebar"
import { usePathname } from "next/navigation"
import type React, { useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/layout"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/router"
import toast from "@/components/toast"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await supabase.auth.getSession()
        if (!session.data.session) {
          router.push('/signin')
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.data.session.user.id)
          .single()

        if (error || !profile || profile.role !== 'admin') {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access this area',
            variant: 'destructive',
          })
          router.push('/user/dashboard')
        }
      } catch (error) {
        console.error('Session check error:', error)
        router.push('/signin')
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

  return <DashboardLayout>{children}</DashboardLayout>
}
