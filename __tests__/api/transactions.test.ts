import { DatabaseTransaction, TransactionOperation } from '@/lib/supabase/db-transaction'
import { mockSupabaseClient, TEST_USERS, TEST_WALLETS } from '../setup'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => mockSupabaseClient)
}))

describe('Transaction API', () => {
  let dbTransaction: DatabaseTransaction

  beforeEach(() => {
    dbTransaction = new DatabaseTransaction(mockSupabaseClient)
  })

  describe('Money Transfer', () => {
    const sender = TEST_USERS.user
    const receiver = TEST_USERS.admin
    const amount = 100.00

    it('should successfully transfer money between wallets', async () => {
      // Mock wallet queries
      mockSupabaseClient.from('wallets').select('*').eq('user_id', sender.id).single()
        .mockResolvedValueOnce({ data: TEST_WALLETS.user, error: null })
      mockSupabaseClient.from('wallets').select('*').eq('user_id', receiver.id).single()
        .mockResolvedValueOnce({ data: TEST_WALLETS.admin, error: null })

      // Mock transaction operations
      mockSupabaseClient.rpc('begin_transaction').mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseClient.rpc('commit_transaction').mockResolvedValueOnce({ data: null, error: null })

      const operations: TransactionOperation[] = [
        {
          table: 'wallets',
          type: 'update',
          data: { balance: TEST_WALLETS.user.balance - amount },
          condition: { user_id: sender.id }
        },
        {
          table: 'wallets',
          type: 'update',
          data: { balance: TEST_WALLETS.admin.balance + amount },
          condition: { user_id: receiver.id }
        },
        {
          table: 'transactions',
          type: 'insert',
          data: {
            sender_id: sender.id,
            receiver_id: receiver.id,
            amount,
            currency: 'USD',
            type: 'transfer'
          }
        }
      ]

      const result = await dbTransaction.execute(operations)
      expect(result.success).toBe(true)
    })

    it('should rollback on insufficient funds', async () => {
      const largeAmount = 10000.00

      // Mock wallet query with low balance
      mockSupabaseClient.from('wallets').select('*').eq('user_id', sender.id).single()
        .mockResolvedValueOnce({ data: TEST_WALLETS.user, error: null })

      const operations: TransactionOperation[] = [
        {
          table: 'wallets',
          type: 'update',
          data: { balance: TEST_WALLETS.user.balance - largeAmount },
          condition: { user_id: sender.id }
        }
      ]

      const result = await dbTransaction.execute(operations)
      expect(result.success).toBe(false)
      expect(result.error).toContain('insufficient funds')
    })
  })

  describe('Deposit', () => {
    it('should successfully process deposit', async () => {
      const amount = 500.00
      const user = TEST_USERS.user

      mockSupabaseClient.from('wallets').select('*').eq('user_id', user.id).single()
        .mockResolvedValueOnce({ data: TEST_WALLETS.user, error: null })

      const operations: TransactionOperation[] = [
        {
          table: 'wallets',
          type: 'update',
          data: { balance: TEST_WALLETS.user.balance + amount },
          condition: { user_id: user.id }
        },
        {
          table: 'transactions',
          type: 'insert',
          data: {
            receiver_id: user.id,
            amount,
            currency: 'USD',
            type: 'deposit'
          }
        }
      ]

      const result = await dbTransaction.execute(operations)
      expect(result.success).toBe(true)
    })
  })

  describe('Withdrawal', () => {
    it('should successfully process withdrawal', async () => {
      const amount = 100.00
      const user = TEST_USERS.user

      mockSupabaseClient.from('wallets').select('*').eq('user_id', user.id).single()
        .mockResolvedValueOnce({ data: TEST_WALLETS.user, error: null })

      const operations: TransactionOperation[] = [
        {
          table: 'wallets',
          type: 'update',
          data: { balance: TEST_WALLETS.user.balance - amount },
          condition: { user_id: user.id }
        },
        {
          table: 'transactions',
          type: 'insert',
          data: {
            sender_id: user.id,
            amount,
            currency: 'USD',
            type: 'withdrawal'
          }
        }
      ]

      const result = await dbTransaction.execute(operations)
      expect(result.success).toBe(true)
    })

    it('should fail withdrawal with insufficient funds', async () => {
      const amount = 1000.00
      const user = TEST_USERS.user

      mockSupabaseClient.from('wallets').select('*').eq('user_id', user.id).single()
        .mockResolvedValueOnce({ data: TEST_WALLETS.user, error: null })

      const operations: TransactionOperation[] = [
        {
          table: 'wallets',
          type: 'update',
          data: { balance: TEST_WALLETS.user.balance - amount },
          condition: { user_id: user.id }
        }
      ]

      const result = await dbTransaction.execute(operations)
      expect(result.success).toBe(false)
      expect(result.error).toContain('insufficient funds')
    })
  })
})
