import { useCallback, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { AppError, handleAuthError } from '@/lib/utils/error-handler'

export function useAuth() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
      } catch (error) {
        handleAuthError(error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
        router.refresh()
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      router.push('/user/dashboard')
    } catch (error) {
      throw new AppError('Invalid email or password', 401)
    }
  }, [supabase, router])

  const signUp = useCallback(async (email: string, password: string, metadata: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      if (error) throw error
      return true
    } catch (error) {
      throw new AppError('Failed to create account', 400)
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/auth/signin')
    } catch (error) {
      handleAuthError(error)
    }
  }, [supabase, router])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      return true
    } catch (error) {
      throw new AppError('Failed to send reset password email', 400)
    }
  }, [supabase])

  const updatePassword = useCallback(async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })
      if (error) throw error
      return true
    } catch (error) {
      throw new AppError('Failed to update password', 400)
    }
  }, [supabase])

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }
}
