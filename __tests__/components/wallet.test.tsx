import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletBalance } from '@/components/wallet/balance'
import { TransactionList } from '@/components/wallet/transaction-list'
import { TransferForm } from '@/components/wallet/transfer-form'
import { mockSupabaseClient, TEST_USERS, TEST_WALLETS } from '../setup'
import '@testing-library/jest-dom'

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabaseClient)
}))

describe('Wallet Components', () => {
  const user = TEST_USERS.user
  const userWallet = TEST_WALLETS.user

  describe('WalletBalance', () => {
    it('should display wallet balance', async () => {
      mockSupabaseClient.from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .mockResolvedValueOnce({ data: userWallet, error: null })

      render(<WalletBalance userId={user.id} />)

      await waitFor(() => {
        expect(screen.getByText('$500.00')).toBeInTheDocument()
        expect(screen.getByText('USD')).toBeInTheDocument()
      })
    })

    it('should handle loading state', () => {
      mockSupabaseClient.from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .mockImplementationOnce(() => new Promise(() => {}))

      render(<WalletBalance userId={user.id} />)
      
      expect(screen.getByTestId('balance-loader')).toBeInTheDocument()
    })

    it('should handle error state', async () => {
      mockSupabaseClient.from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .mockResolvedValueOnce({ 
          data: null, 
          error: { message: 'Failed to fetch balance' } 
        })

      render(<WalletBalance userId={user.id} />)

      await waitFor(() => {
        expect(screen.getByText(/error loading balance/i)).toBeInTheDocument()
      })
    })
  })

  describe('TransactionList', () => {
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

    it('should display transaction history', async () => {
      mockSupabaseClient.from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .mockResolvedValueOnce({ data: transactions, error: null })

      render(<TransactionList userId={user.id} />)

      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument()
        expect(screen.getByText('$500.00')).toBeInTheDocument()
        expect(screen.getByText(/transfer/i)).toBeInTheDocument()
        expect(screen.getByText(/deposit/i)).toBeInTheDocument()
      })
    })

    it('should filter transactions by type', async () => {
      mockSupabaseClient.from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .mockResolvedValueOnce({ data: transactions, error: null })

      render(<TransactionList userId={user.id} />)

      fireEvent.click(screen.getByText(/filter/i))
      fireEvent.click(screen.getByText(/deposits only/i))

      await waitFor(() => {
        expect(screen.queryByText('$100.00')).not.toBeInTheDocument()
        expect(screen.getByText('$500.00')).toBeInTheDocument()
      })
    })
  })

  describe('TransferForm', () => {
    it('should handle successful transfer', async () => {
      mockSupabaseClient.from('profiles')
        .select('*')
        .eq('email', 'admin1@test.com')
        .single()
        .mockResolvedValueOnce({ data: TEST_USERS.admin, error: null })

      mockSupabaseClient.rpc('transfer_money', {
        sender_id: user.id,
        receiver_id: TEST_USERS.admin.id,
        amount: 50
      }).mockResolvedValueOnce({ data: { success: true }, error: null })

      render(<TransferForm userId={user.id} />)

      fireEvent.change(screen.getByLabelText(/recipient email/i), {
        target: { value: 'admin1@test.com' }
      })
      fireEvent.change(screen.getByLabelText(/amount/i), {
        target: { value: '50' }
      })
      fireEvent.click(screen.getByRole('button', { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/transfer successful/i)).toBeInTheDocument()
      })
    })

    it('should validate recipient email', async () => {
      render(<TransferForm userId={user.id} />)

      fireEvent.change(screen.getByLabelText(/recipient email/i), {
        target: { value: 'invalid-email' }
      })
      fireEvent.click(screen.getByRole('button', { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('should validate transfer amount', async () => {
      render(<TransferForm userId={user.id} />)

      fireEvent.change(screen.getByLabelText(/amount/i), {
        target: { value: '-50' }
      })
      fireEvent.click(screen.getByRole('button', { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
      })
    })
  })
})
