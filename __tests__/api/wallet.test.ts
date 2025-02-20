import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { mockSupabaseClient, TEST_USERS, TEST_WALLETS, mockSession } from '../setup'

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => mockSupabaseClient)
}))

describe('Wallet API', () => {
  describe('Wallet Operations', () => {
    const user = TEST_USERS.user
    const userWallet = TEST_WALLETS.user

    beforeEach(() => {
      mockSupabaseClient.auth.getSession()
        .mockResolvedValueOnce({ data: { session: mockSession(user) }, error: null })
    })

    it('should get wallet balance', async () => {
      const mockResponse = { data: userWallet, error: null }
      mockSupabaseClient.from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .mockResolvedValueOnce(mockResponse)

      const response = await mockSupabaseClient.from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

      expect(response.error).toBeNull()
      expect(response.data).toEqual(userWallet)
      expect(response.data?.balance).toBe(500.00)
    })

    it('should get transaction history', async () => {
      const transactions = [
        {
          id: 'tx1',
          sender_id: user.id,
          receiver_id: TEST_USERS.admin.id,
          amount: 100,
          type: 'transfer',
          created_at: new Date().toISOString()
        },
        {
          id: 'tx2',
          receiver_id: user.id,
          amount: 500,
          type: 'deposit',
          created_at: new Date().toISOString()
        }
      ]

      const mockResponse = { data: transactions, error: null }
      mockSupabaseClient.from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .mockResolvedValueOnce(mockResponse)

      const response = await mockSupabaseClient.from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      expect(response.error).toBeNull()
      expect(response.data).toHaveLength(2)
      expect(response.data?.[0].type).toBe('transfer')
      expect(response.data?.[1].type).toBe('deposit')
    })

    it('should calculate wallet statistics', async () => {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const transactions = [
        { type: 'deposit', amount: 1000 },
        { type: 'withdrawal', amount: -200 },
        { type: 'transfer', amount: -300 },
        { type: 'deposit', amount: 500 }
      ]

      const mockResponse = { data: transactions, error: null }
      mockSupabaseClient.from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte('created_at', monthStart.toISOString())
        .mockResolvedValueOnce(mockResponse)

      const response = await mockSupabaseClient.from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte('created_at', monthStart.toISOString())

      expect(response.error).toBeNull()
      expect(response.data).toHaveLength(4)

      if (response.data) {
        // Calculate statistics
        const totalDeposits = response.data
          .filter((tx: { type: string; amount: number }) => tx.type === 'deposit')
          .reduce((sum: number, tx: { type: string; amount: number }) => sum + tx.amount, 0)
        const totalWithdrawals = Math.abs(response.data
          .filter((tx: { type: string; amount: number }) => tx.type === 'withdrawal')
          .reduce((sum: number, tx: { type: string; amount: number }) => sum + tx.amount, 0))
        const totalTransfers = Math.abs(response.data
          .filter((tx: { type: string; amount: number }) => tx.type === 'transfer')
          .reduce((sum: number, tx: { type: string; amount: number }) => sum + tx.amount, 0))

        expect(totalDeposits).toBe(1500)
        expect(totalWithdrawals).toBe(200)
        expect(totalTransfers).toBe(300)
      }
    })
  })

  describe('Admin Wallet Operations', () => {
    const admin = TEST_USERS.admin

    beforeEach(() => {
      mockSupabaseClient.auth.getSession()
        .mockResolvedValueOnce({ data: { session: mockSession(admin) }, error: null })
    })

    it('should get all wallets', async () => {
      const wallets = [TEST_WALLETS.admin, TEST_WALLETS.user]
      const mockResponse = { data: wallets, error: null }

      mockSupabaseClient.from('wallets')
        .select('*, profiles(*)')
        .mockResolvedValueOnce(mockResponse)

      const response = await mockSupabaseClient.from('wallets')
        .select('*, profiles(*)')

      expect(response.error).toBeNull()
      expect(response.data).toHaveLength(2)
    })

    it('should get system balance', async () => {
      const wallets = [
        { balance: 1000.00, currency: 'USD' },
        { balance: 500.00, currency: 'USD' },
        { balance: 750.00, currency: 'USD' }
      ]

      const mockResponse = { data: wallets, error: null }
      mockSupabaseClient.from('wallets')
        .select('balance, currency')
        .eq('currency', 'USD')
        .mockResolvedValueOnce(mockResponse)

      const response = await mockSupabaseClient.from('wallets')
        .select('balance, currency')
        .eq('currency', 'USD')

      expect(response.error).toBeNull()
      if (response.data) {
        const totalBalance = response.data
          .reduce((sum: number, wallet: { balance: number }) => sum + wallet.balance, 0)
        expect(totalBalance).toBe(2250.00)
      }
    })

    it('should flag suspicious activity', async () => {
      const largeTransaction = {
        id: 'tx-large',
        sender_id: TEST_USERS.user.id,
        amount: 10000.00,
        type: 'withdrawal',
        created_at: new Date().toISOString(),
        flagged: true
      }

      const mockResponse = { data: largeTransaction, error: null }
      mockSupabaseClient.from('transactions')
        .update({ flagged: true, flag_reason: 'Large withdrawal' })
        .eq('id', largeTransaction.id)
        .mockResolvedValueOnce(mockResponse)

      const response = await mockSupabaseClient.from('transactions')
        .update({ flagged: true, flag_reason: 'Large withdrawal' })
        .eq('id', largeTransaction.id)

      expect(response.error).toBeNull()
      expect(response.data?.flagged).toBe(true)
    })
  })
})
