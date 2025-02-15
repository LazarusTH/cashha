'use client';

import { useCallback, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { AppError, handleAuthError } from '@/lib/utils/error-handler'

export function useAuth() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
        setError(null)
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Failed to get user'))
        handleAuthError(error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            setUser(session.user)
            setError(null)
          } else {
            setUser(null)
          }
          setLoading(false)
          router.refresh()
        } catch (error) {
          setError(error instanceof Error ? error : new Error('Auth state change error'))
          console.error('Auth state change error:', error)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      router.push('/user/dashboard')
      setError(null)
    } catch (error) {
      setError(new AppError('Invalid email or password', 401))
      throw new AppError('Invalid email or password', 401)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  const signUp = useCallback(async (email: string, password: string, metadata: any) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      if (error) throw error
      setError(null)
      return true
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to sign up'))
      throw error
    } finally {
      setLoading(false)
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
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }
}
