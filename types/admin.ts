export interface UserLimits {
  send_limit?: number | null
  withdraw_limit?: number | null
  daily_limit?: number | null
  monthly_limit?: number | null
}

export interface UserMetadata {
  balance?: number
  send_limit?: number
  withdraw_limit?: number
  id_card_url?: string
  rejection_reason?: string
  [key: string]: any
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  status: 'pending' | 'active' | 'rejected' | 'blocked'
  created_at: string
  metadata?: UserMetadata
} 