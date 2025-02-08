export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed'
export type TransactionType = 'deposit' | 'withdrawal' | 'send'

export interface Transaction {
  id: string
  user_id: string
  recipient_id?: string
  type: TransactionType
  amount: number
  status: TransactionStatus
  created_at: string
  updated_at: string
  approved_at?: string
  approved_by?: string
  rejected_at?: string
  rejected_by?: string
  rejection_reason?: string
  description?: string
}

export interface Deposit extends Transaction {
  type: 'deposit'
  payment_method: string
}

export interface Withdrawal extends Transaction {
  type: 'withdrawal'
  bank_name: string
  account_number: string
  account_name: string
}

export interface Send extends Transaction {
  type: 'send'
  recipient_id: string
}

export interface TransactionLimits {
  minAmount: number
  maxAmount: number
  dailyLimit: number
  dailyUsed: number
  monthlyLimit: number
  monthlyUsed: number
}

export interface DashboardStats {
  currentBalance: number
  totalDeposited: number
  totalWithdrawn: number
  totalSent: number
  totalReceived: number
  recentTransactions: Transaction[]
  monthlyStats: Array<{
    name: string
    deposits: number
    withdrawals: number
    sent: number
    received: number
  }>
}
