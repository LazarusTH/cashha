import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Mock the dependencies
vi.mock('@supabase/auth-helpers-nextjs')
vi.mock('next/headers')

describe('Admin Bulk Sending API', () => {
  let supabase: any

  beforeEach(() => {
    supabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn(),
      in: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn()
    }

    ;(createRouteHandlerClient as any).mockReturnValue(supabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/admin/sending/bulk', () => {
    it('should process bulk transfer successfully', async () => {
      const mockRecipients = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' }
      ]

      supabase.select.mockResolvedValue({
        data: mockRecipients.map(r => ({ id: 'test-id', ...r })),
        error: null
      })

      supabase.insert.mockResolvedValue({ error: null })

      const response = await fetch('/api/admin/sending/bulk', {
        method: 'POST',
        body: JSON.stringify({
          recipients: mockRecipients,
          amount: 100,
          description: 'Test bulk transfer'
        })
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.count).toBe(2)
    })
  })

  describe('POST /api/admin/sending/validate', () => {
    it('should validate recipients successfully', async () => {
      const mockRecipients = [
        { email: 'valid@example.com' },
        { email: 'invalid@example.com' }
      ]

      supabase.select.mockResolvedValue({
        data: [{ email: 'valid@example.com', full_name: 'Valid User' }],
        error: null
      })

      const response = await fetch('/api/admin/sending/validate', {
        method: 'POST',
        body: JSON.stringify({
          recipients: mockRecipients
        })
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.valid).toHaveLength(1)
      expect(data.invalid).toHaveLength(1)
    })
  })
})
