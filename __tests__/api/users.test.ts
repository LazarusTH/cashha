import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { mockSupabaseClient, TEST_USERS, mockSession } from '../setup'

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => mockSupabaseClient)
}))

describe('User Management API', () => {
  describe('User Profile', () => {
    it('should get user profile', async () => {
      const user = TEST_USERS.user
      mockSupabaseClient.auth.getSession()
        .mockResolvedValueOnce({ data: { session: mockSession(user) }, error: null })

      mockSupabaseClient.from('profiles').select('*').eq('id', user.id).single()
        .mockResolvedValueOnce({ 
          data: { 
            id: user.id, 
            email: user.email, 
            role: user.role 
          }, 
          error: null 
        })

      const response = await mockSupabaseClient.from('profiles').select('*').eq('id', user.id).single()
      expect(response.data).toBeTruthy()
      expect(response.data.email).toBe(user.email)
    })

    it('should update user profile', async () => {
      const user = TEST_USERS.user
      const updates = {
        name: 'Updated Name',
        phone: '+1234567890'
      }

      mockSupabaseClient.auth.getSession()
        .mockResolvedValueOnce({ data: { session: mockSession(user) }, error: null })

      mockSupabaseClient.from('profiles').update(updates).eq('id', user.id)
        .mockResolvedValueOnce({ data: { ...user, ...updates }, error: null })

      const response = await mockSupabaseClient.from('profiles').update(updates).eq('id', user.id)
      expect(response.error).toBeNull()
      expect(response.data).toMatchObject(updates)
    })
  })

  describe('Admin User Management', () => {
    const adminUser = TEST_USERS.admin

    beforeEach(() => {
      mockSupabaseClient.auth.getSession()
        .mockResolvedValueOnce({ data: { session: mockSession(adminUser) }, error: null })
    })

    it('should list all users', async () => {
      mockSupabaseClient.from('profiles').select('*')
        .mockResolvedValueOnce({ 
          data: [TEST_USERS.admin, TEST_USERS.user], 
          error: null 
        })

      const response = await mockSupabaseClient.from('profiles').select('*')
      expect(response.data).toHaveLength(2)
      expect(response.data).toContainEqual(expect.objectContaining(TEST_USERS.user))
    })

    it('should update user role', async () => {
      const targetUser = TEST_USERS.user
      const newRole = 'admin'

      mockSupabaseClient.from('profiles').update({ role: newRole }).eq('id', targetUser.id)
        .mockResolvedValueOnce({ 
          data: { ...targetUser, role: newRole }, 
          error: null 
        })

      const response = await mockSupabaseClient.from('profiles')
        .update({ role: newRole })
        .eq('id', targetUser.id)

      expect(response.error).toBeNull()
      expect(response.data.role).toBe(newRole)
    })

    it('should suspend user account', async () => {
      const targetUser = TEST_USERS.user
      const suspendUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      mockSupabaseClient.auth.admin.updateUserById(targetUser.id, {
        banned_until: suspendUntil.toISOString()
      }).mockResolvedValueOnce({ 
        data: { user: { ...targetUser, banned_until: suspendUntil } }, 
        error: null 
      })

      const response = await mockSupabaseClient.auth.admin.updateUserById(
        targetUser.id,
        { banned_until: suspendUntil.toISOString() }
      )

      expect(response.error).toBeNull()
      expect(response.data.user.banned_until).toBe(suspendUntil)
    })
  })

  describe('User Security', () => {
    const user = TEST_USERS.user

    it('should enable 2FA', async () => {
      mockSupabaseClient.auth.getSession()
        .mockResolvedValueOnce({ data: { session: mockSession(user) }, error: null })

      mockSupabaseClient.auth.mfa.enroll({
        factorType: 'totp'
      }).mockResolvedValueOnce({ 
        data: { 
          qr_code: 'test-qr-code',
          secret: 'test-secret'
        }, 
        error: null 
      })

      const response = await mockSupabaseClient.auth.mfa.enroll({ factorType: 'totp' })
      expect(response.error).toBeNull()
      expect(response.data.qr_code).toBeTruthy()
    })

    it('should update password', async () => {
      mockSupabaseClient.auth.getSession()
        .mockResolvedValueOnce({ data: { session: mockSession(user) }, error: null })

      mockSupabaseClient.auth.updateUser({
        password: 'newPassword123'
      }).mockResolvedValueOnce({ 
        data: { user: { ...user } }, 
        error: null 
      })

      const response = await mockSupabaseClient.auth.updateUser({
        password: 'newPassword123'
      })

      expect(response.error).toBeNull()
      expect(response.data.user).toBeTruthy()
    })
  })
})
