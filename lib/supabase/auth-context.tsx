'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getCurrentUser } from './client'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

type AuthContextType = {
  user: User | null
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: UserData) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateEmail: (email: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
  deleteAccount: () => Promise<void>
  isEmailVerified: boolean
  role: 'admin' | 'user' | null
  lastActive: Date | null
}

interface UserData {
  full_name: string
  phone_number?: string
  date_of_birth?: string
  nationality?: string
  address?: string
}

interface UserProfile {
  full_name: string
  phone_number: string
  date_of_birth: string
  nationality: string
  address: string
  avatar_url?: string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  updateEmail: async () => {},
  verifyEmail: async () => {},
  refreshSession: async () => {},
  updateProfile: async () => {},
  deleteAccount: async () => {},
  isEmailVerified: false,
  role: null,
  lastActive: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [lastActive, setLastActive] = useState<Date | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check active session and user metadata
    const checkUser = async () => {
      try {
        const { user, error } = await getCurrentUser()
        if (error) throw error
        
        if (user) {
          setUser(user)
          setIsEmailVerified(user.email_confirmed_at != null)
          
          // Fetch user role and metadata
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, last_active')
            .eq('id', user.id)
            .single()
            
          if (profileError) throw profileError
          
          setRole(profile.role)
          setLastActive(profile.last_active ? new Date(profile.last_active) : null)
          
          // Update last active timestamp
          await supabase
            .from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('id', user.id)
        }
      } catch (e) {
        console.error('Error checking user:', e)
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user
      setUser(user ?? null)
      
      if (user) {
        setIsEmailVerified(user.email_confirmed_at != null)
        
        // Fetch user role and metadata on auth state change
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, last_active')
          .eq('id', user.id)
          .single()
          
        if (profile) {
          setRole(profile.role)
          setLastActive(profile.last_active ? new Date(profile.last_active) : null)
        }
      } else {
        setIsEmailVerified(false)
        setRole(null)
        setLastActive(null)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // Check if user is blocked
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('blocked, blocked_reason')
        .eq('id', user?.id)
        .single()
        
      if (profileError) throw profileError
      
      if (profile.blocked) {
        await signOut()
        throw new Error(`Account is blocked. Reason: ${profile.blocked_reason}`)
      }
      
      toast({
        title: "Success",
        description: "Successfully signed in",
      })
      
      // Redirect based on role
      if (role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/user/dashboard')
      }
    } catch (error) {
      console.error('Error signing in:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in",
        variant: "destructive",
      })
      throw error
    }
  }

  const signUp = async (email: string, password: string, userData: UserData) => {
    try {
      // Start a Supabase transaction
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) throw signUpError

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user?.id,
            email,
            full_name: userData.full_name,
            phone_number: userData.phone_number,
            date_of_birth: userData.date_of_birth,
            nationality: userData.nationality,
            address: userData.address,
            role: 'user',
            created_at: new Date().toISOString(),
          },
        ])
      if (profileError) throw profileError
      
      toast({
        title: "Success",
        description: "Successfully signed up. Please check your email for verification.",
      })
      
      // Send welcome email
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          template: 'welcome',
          data: {
            name: userData.full_name,
          },
        }),
      })
      
    } catch (error) {
      console.error('Error signing up:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign up",
        variant: "destructive",
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      router.push('/')
      toast({
        title: "Success",
        description: "Successfully signed out",
      })
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox.",
      })
    } catch (error) {
      console.error('Error resetting password:', error)
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      })
      throw error
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Password updated successfully",
      })
    } catch (error) {
      console.error('Error updating password:', error)
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email,
      })
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Email update verification sent. Please check your inbox.",
      })
    } catch (error) {
      console.error('Error updating email:', error)
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive",
      })
      throw error
    }
  }

  const verifyEmail = async (token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      })
      if (error) throw error
      
      setIsEmailVerified(true)
      toast({
        title: "Success",
        description: "Email verified successfully",
      })
    } catch (error) {
      console.error('Error verifying email:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify email",
        variant: "destructive",
      })
      throw error
    }
  }

  const refreshSession = async () => {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) throw error
    } catch (error) {
      console.error('Error refreshing session:', error)
      throw error
    }
  }

  const updateProfile = async (profile: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user?.id)
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteAccount = async () => {
    try {
      // Delete user data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id)
      if (profileError) throw profileError

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(
        user?.id as string
      )
      if (authError) throw authError

      await signOut()
      toast({
        title: "Success",
        description: "Account deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateEmail,
        verifyEmail,
        refreshSession,
        updateProfile,
        deleteAccount,
        isEmailVerified,
        role,
        lastActive,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
