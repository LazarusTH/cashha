import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignInForm } from '@/components/auth/signin-form'
import { SignUpForm } from '@/components/auth/signup-form'
import { mockSupabaseClient } from '../setup'
import '@testing-library/jest-dom'
import { AuthError } from '@supabase/supabase-js'

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabaseClient)
}))

describe('Authentication Components', () => {
  describe('SignInForm', () => {
    it('should render sign in form', () => {
      render(<SignInForm />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should handle successful sign in', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: {
            id: '123',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            role: 'authenticated',
            updated_at: new Date().toISOString()
          },
          session: {
            access_token: 'test-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'test-refresh',
            user: {
              id: '123',
              email: 'test@example.com',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              role: 'authenticated',
              updated_at: new Date().toISOString()
            }
          }
        },
        error: null
      })

      render(<SignInForm />)
      
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    it('should display error message on failed sign in', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new AuthError('Invalid credentials', {
          status: 400,
          code: 'invalid_credentials'
        })
      })

      render(<SignInForm />)
      
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'wrong@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpass' }
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })
  })

  describe('SignUpForm', () => {
    it('should render sign up form', () => {
      render(<SignUpForm />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })

    it('should handle successful sign up', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: {
          user: {
            id: '123',
            email: 'new@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            role: 'authenticated',
            updated_at: new Date().toISOString()
          },
          session: {
            access_token: 'test-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'test-refresh',
            user: {
              id: '123',
              email: 'new@example.com',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              role: 'authenticated',
              updated_at: new Date().toISOString()
            }
          }
        },
        error: null
      })

      render(<SignUpForm />)
      
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'new@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'newpass123' }
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'newpass123' }
      })
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'newpass123'
        })
      })
    })

    it('should validate password match', async () => {
      render(<SignUpForm />)
      
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'pass123' }
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'different123' }
      })
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      render(<SignUpForm />)
      
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'invalid-email' }
      })
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Reset', () => {
    it('should handle password reset request', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null
      })

      render(<SignInForm />)
      
      fireEvent.click(screen.getByText(/forgot password/i))
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      })
      fireEvent.click(screen.getByRole('button', { name: /reset password/i }))

      await waitFor(() => {
        expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com'
        )
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      })
    })
  })
})
