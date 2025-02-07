import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://udmfczwihczfijsqrrnl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbWZjendpaGN6Zmlqc3Fycm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4MTg1NjIsImV4cCI6MjA1NDM5NDU2Mn0.05CTF0cUeo01Jx3kJoUy0WtPSgQfWWJQOh2L7vQmYWg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}
