import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn()
}))

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

describe('Account Management API', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn(),
        signOut: jest.fn(),
        mfa: {
          enroll: jest.fn(),
          listFactors: jest.fn()
        }
      }
    }
    ;(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('POST /api/user/account/close', () => {
    it('should close user account when no pending transactions', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } }
      })

      // Mock no pending transactions
      mockSupabase.single.mockResolvedValue({ data: null })

      // Mock profile update
      mockSupabase.update.mockResolvedValue({ data: null })

      const response = await fetch('/api/user/account/close', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Moving to another service' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Account closed successfully')
    })

    it('should prevent closure with pending transactions', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } }
      })

      // Mock pending transaction
      mockSupabase.single.mockResolvedValue({
        data: { id: 'tx-1' }
      })

      const response = await fetch('/api/user/account/close', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Moving to another service' })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Cannot close account with pending transactions')
    })
  })

  describe('GET /api/user/account/export', () => {
    it('should export user data in GDPR format', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id', email: 'user@example.com' } }
      })

      // Mock profile data
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'user-id',
          full_name: 'Test User',
          status: 'active'
        }
      })

      // Mock transactions
      mockSupabase.select.mockResolvedValueOnce({
        data: [{
          id: 'tx-1',
          amount: 1000,
          type: 'transfer',
          status: 'completed'
        }]
      })

      const response = await fetch('/api/user/account/export')
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.profile).toBeDefined()
      expect(data.transactions).toHaveLength(1)
      expect(data.exportDate).toBeDefined()
    })
  })

  describe('GET /api/user/account/security', () => {
    it('should fetch security settings and events', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } }
      })

      // Mock security settings
      mockSupabase.single.mockResolvedValue({
        data: {
          require_2fa: true,
          last_security_review: '2025-02-07T00:00:00Z'
        }
      })

      // Mock security events
      mockSupabase.select.mockResolvedValue({
        data: [{
          action: 'LOGIN_ATTEMPT',
          details: { success: true }
        }]
      })

      // Mock 2FA factors
      mockSupabase.auth.mfa.listFactors.mockResolvedValue({
        data: {
          totp: [{ id: 'factor-1', status: 'enabled' }]
        }
      })

      const response = await fetch('/api/user/account/security')
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.settings.require_2fa).toBe(true)
      expect(data.securityEvents).toHaveLength(1)
      expect(data.factors).toBeDefined()
    })
  })

  describe('PUT /api/user/account/security', () => {
    it('should update security settings and setup 2FA', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } }
      })

      // Mock settings update
      mockSupabase.upsert.mockResolvedValue({
        data: {
          require_2fa: true,
          last_security_review: expect.any(String)
        }
      })

      // Mock 2FA enrollment
      mockSupabase.auth.mfa.enroll.mockResolvedValue({
        data: {
          qr: 'qr-code-data',
          secret: 'totp-secret'
        }
      })

      const response = await fetch('/api/user/account/security', {
        method: 'PUT',
        body: JSON.stringify({
          require_2fa: true,
          daily_transfer_limit: 10000
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Security settings updated')
      expect(data.factorData).toBeDefined()
    })
  })
})
