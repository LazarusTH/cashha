import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { withAuth } from '@/middleware/auth'
import { withAdminAuth } from '@/middleware/admin-auth'
import { NextResponse } from 'next/server'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn()
}))

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

describe('Authentication Middleware', () => {
  let mockSupabase: any
  let mockHandler: jest.Mock
  let mockRequest: Request

  beforeEach(() => {
    // Reset mocks
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
        refreshSession: jest.fn()
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }

    ;(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase)
    
    mockHandler = jest.fn().mockImplementation(() => Promise.resolve(new Response()))
    mockRequest = new Request('http://localhost:3000/api/test', {
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent'
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('withAuth middleware', () => {
    it('should allow valid session', async () => {
      // Mock valid session
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }
      
      mockSupabase.auth.getSession.mockResolvedValue({ 
        data: { session: mockSession }, 
        error: null 
      })

      const protectedHandler = withAuth(mockHandler)
      await protectedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should reject expired session', async () => {
      // Mock expired session
      const mockSession = {
        user: { id: 'test-user' },
        expires_at: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      }
      
      mockSupabase.auth.getSession.mockResolvedValue({ 
        data: { session: mockSession }, 
        error: null 
      })

      const protectedHandler = withAuth(mockHandler)
      const response = await protectedHandler(mockRequest)
      const responseData = await response.json()

      expect(responseData.error).toBe('Authentication failed')
      expect(response.status).toBe(401)
    })

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Auth error'))

      const protectedHandler = withAuth(mockHandler)
      const response = await protectedHandler(mockRequest)
      const responseData = await response.json()

      expect(responseData.error).toBe('Authentication failed')
      expect(response.status).toBe(401)
    })
  })

  describe('withAdminAuth middleware', () => {
    it('should allow admin access', async () => {
      // Mock valid admin session
      const mockSession = {
        user: { id: 'admin-user', email: 'admin@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      
      mockSupabase.auth.getSession.mockResolvedValue({ 
        data: { session: mockSession }, 
        error: null 
      })

      mockSupabase.single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      })

      const protectedHandler = withAdminAuth(mockHandler)
      await protectedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should reject non-admin users', async () => {
      // Mock regular user session
      const mockSession = {
        user: { id: 'regular-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      
      mockSupabase.auth.getSession.mockResolvedValue({ 
        data: { session: mockSession }, 
        error: null 
      })

      mockSupabase.single.mockResolvedValue({
        data: { role: 'user' },
        error: null
      })

      const protectedHandler = withAdminAuth(mockHandler)
      const response = await protectedHandler(mockRequest)
      const responseData = await response.json()

      expect(responseData.error).toBe('Forbidden - Admin access required')
      expect(response.status).toBe(403)
    })
  })
})