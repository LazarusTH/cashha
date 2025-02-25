'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'
import { toast } from '@/components/ui/use-toast'

interface AuthContextType {
  user: any
  profile: any
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: UserData) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateEmail: (email: string) => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
  deleteAccount: () => Promise<void>
  isEmailVerified: boolean
  role: 'admin' | 'user' | null
  lastActive: Date | null
  isAdmin: () => boolean
  hasPermission: (permission: string) => boolean
  permissions: string[]
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
  profile: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  updateEmail: async () => {},
  refreshSession: async () => {},
  updateProfile: async () => {},
  deleteAccount: async () => {},
  isEmailVerified: false,
  role: null,
  lastActive: null,
  isAdmin: () => false,
  hasPermission: () => false,
  permissions: []
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [lastActive, setLastActive] = useState<Date | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const router = useRouter()

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (session?.user) {
          setUser(session.user)
          setIsEmailVerified(session.user.email_confirmed_at != null)

          // Fetch user profile and permissions
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*, roles(permissions)')
            .eq('id', session.user.id)
            .single()

          if (profileError) throw profileError

          setProfile(profileData)
          setRole(profileData.role)
          setPermissions(profileData.roles?.permissions || [])
          setLastActive(new Date())
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setError(error instanceof Error ? error : new Error('Failed to initialize auth'))
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        setIsEmailVerified(session.user.email_confirmed_at != null)

        // Fetch user profile and permissions on auth state change
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, roles(permissions)')
          .eq('id', session.user.id)
          .single()

        if (!profileError && profileData) {
          setProfile(profileData)
          setRole(profileData.role)
          setPermissions(profileData.roles?.permissions || [])
          setLastActive(new Date())
        }
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
        setPermissions([])
        setLastActive(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

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

  const verifyEmail = async (email: string, token: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.verifyEmailChange(token);
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
        setIsEmailVerified(profile.email_confirmed_at != null)
        setRole(profile.role)
        setLastActive(profile.last_active ? new Date(profile.last_active) : null)
      }
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

  const isAdmin = () => role === 'admin'

  const hasPermission = (permission: string) => {
    return permissions.includes(permission)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
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
        isAdmin,
        hasPermission,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
