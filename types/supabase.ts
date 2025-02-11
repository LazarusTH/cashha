export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string
          avatar_url: string | null
          phone_number: string | null
          date_of_birth: string | null
          nationality: string | null
          address: string | null
          role: 'admin' | 'user'
          last_active: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name: string
          avatar_url?: string | null
          phone_number?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          address?: string | null
          role?: 'admin' | 'user'
          last_active?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string
          avatar_url?: string | null
          phone_number?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          address?: string | null
          role?: 'admin' | 'user'
          last_active?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description: string | null
          status: 'pending' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description?: string | null
          status?: 'pending' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          amount?: number
          type?: 'income' | 'expense'
          category?: string
          description?: string | null
          status?: 'pending' | 'completed' | 'failed'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
