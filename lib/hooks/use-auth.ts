'use client';

import { useCallback, useEffect, useState } from 'react'
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { AppError, handleAuthError } from '@/lib/utils/error-handler'

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAdmin: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    error: null,
    isAdmin: false
  })

  const updateState = (updates: Partial<AuthState>) => {
    setState(current => ({ ...current, ...updates }))
  }

  const handleError = (error: unknown, context: string) => {
    console.error(`Auth error (${context}):`, error)
    const appError = error instanceof Error ? error : new Error(`${context} failed`)
    updateState({ error: appError })
    handleAuthError(error)
  }

  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data?.role === 'admin'
    } catch (error) {
      console.error('Admin check error:', error)
      return false
    }
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error

        const isAdmin = user ? await checkAdminStatus(user.id) : false
        
        updateState({
          user,
          isAdmin,
          error: null,
          loading: false
        })
      } catch (error) {
        handleError(error, 'Get user')
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            const isAdmin = await checkAdminStatus(session.user.id)
            updateState({
              user: session.user,
              isAdmin,
              error: null
            })
          } else {
            updateState({
              user: null,
              isAdmin: false
            })
          }
          
          updateState({ loading: false })
          router.refresh()
        } catch (error) {
          handleError(error, 'Auth state change')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, checkAdminStatus])

  const signIn = async (email: string, password: string) => {
    try {
      updateState({ loading: true, error: null })
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error) {
      handleError(error, 'Sign in')
    } finally {
      updateState({ loading: false })
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      updateState({ loading: true, error: null })
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    } catch (error) {
      handleError(error, 'Sign up')
    } finally {
      updateState({ loading: false })
    }
  }

  const signOut = async () => {
    try {
      updateState({ loading: true, error: null })
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      updateState({ user: null, isAdmin: false })
    } catch (error) {
      handleError(error, 'Sign out')
    } finally {
      updateState({ loading: false })
    }
  }

  const resetPassword = async (email: string) => {
    try {
      updateState({ loading: true, error: null })
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    } catch (error) {
      handleError(error, 'Reset password')
    } finally {
      updateState({ loading: false })
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      updateState({ loading: true, error: null })
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    } catch (error) {
      handleError(error, 'Update password')
    } finally {
      updateState({ loading: false })
    }
  }

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword
  }
}
