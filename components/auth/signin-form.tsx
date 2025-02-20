import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const SignInForm = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)

  const supabase = createClientComponentClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      setError(error.message)
    } else {
      setError('Check your email for the reset link')
    }

    setLoading(false)
  }

  return (
    <div>
      {!showResetForm ? (
        <form onSubmit={handleSignIn}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            Sign In
          </button>
          <button type="button" onClick={() => setShowResetForm(true)}>
            Forgot Password
          </button>
          {error && <div className="error">{error}</div>}
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <div>
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            Reset Password
          </button>
          <button type="button" onClick={() => setShowResetForm(false)}>
            Back to Sign In
          </button>
          {error && <div className="error">{error}</div>}
        </form>
      )}
    </div>
  )
}
