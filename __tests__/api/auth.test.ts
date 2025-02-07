import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Mock the dependencies
vi.mock('@supabase/auth-helpers-nextjs')
vi.mock('next/headers')

describe('Authentication API', () => {
  let supabase: any

  beforeEach(() => {
    supabase = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        verifyOtp: vi.fn()
      },
      from: vi.fn().mockReturnThis(),
      insert: vi.fn(),
      select: vi.fn(),
      eq: vi.fn()
    }

    ;(createRouteHandlerClient as any).mockReturnValue(supabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com'
      }

      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      supabase.insert.mockResolvedValue({ error: null })

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'Test User',
          phone: '+1234567890'
        })
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.message).toContain('Registration successful')
    })
  })

  describe('POST /api/auth/signin', () => {
    it('should sign in user successfully', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com'
      }

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
    })
  })
})
