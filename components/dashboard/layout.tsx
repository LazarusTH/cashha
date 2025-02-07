'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/supabase/auth-context'
import { getProfile } from '@/lib/supabase/profile'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/supabase/client'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<any>(null)

  useEffect(() => {
    if (user) {
      getProfile(user.id)
        .then(data => setProfileData(data))
        .catch(console.error)
    }
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/signin')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user || !profileData) {
    return <div>Loading...</div>
  }

  const isAdmin = profileData.role === 'admin'
  const navItems = isAdmin
    ? [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/transactions', label: 'Transactions' },
        { href: '/admin/banks', label: 'Banks' },
        { href: '/admin/requests', label: 'Support Requests' },
      ]
    : [
        { href: '/user/dashboard', label: 'Dashboard' },
        { href: '/user/send', label: 'Send Money' },
        { href: '/user/deposit', label: 'Deposit' },
        { href: '/user/withdraw', label: 'Withdraw' },
        { href: '/user/transactions', label: 'Transactions' },
        { href: '/user/support', label: 'Support' },
      ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <Link href={isAdmin ? '/admin/dashboard' : '/user/dashboard'}>
              <span className="text-2xl font-bold">Cashora</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Link href={`/${isAdmin ? 'admin' : 'user'}/profile`}>
              <span className="text-sm">
                {profileData.full_name}
              </span>
            </Link>
            <Button onClick={handleSignOut} variant="outline">
              Sign out
            </Button>
          </div>
        </div>
        <div className="flex space-x-4 px-4 py-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className="text-sm hover:text-primary">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  )
}
