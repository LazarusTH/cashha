import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './client'

export interface TransactionOperation {
  table: string
  type: 'insert' | 'update' | 'delete'
  data: any
  condition?: any
}

export class DatabaseTransaction {
  private operations: TransactionOperation[] = []
  private rollbackOperations: TransactionOperation[] = []
  
  constructor(private client: SupabaseClient = supabase) {}

  async execute(operations: TransactionOperation[]) {
    try {
      // Begin transaction
      await this.client.rpc('begin_transaction')
      
      // Execute all operations
      for (const operation of operations) {
        const { table, type, data, condition } = operation
        
        // Store rollback operation
        await this.storeRollbackState(table, data, condition)
        
        // Execute operation
        const result = await this.executeOperation(operation)
        if (result.error) {
          throw result.error
        }
      }
      
      // Commit transaction
      await this.client.rpc('commit_transaction')
      
      return { success: true }
    } catch (error) {
      // Rollback on error
      await this.rollback()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Transaction failed' 
      }
    }
  }

  private async storeRollbackState(table: string, data: any, condition?: any) {
    const { data: currentState } = await this.client
      .from(table)
      .select('*')
      .match(condition || data)
      .single()

    if (currentState) {
      this.rollbackOperations.push({
        table,
        type: 'update',
        data: currentState,
        condition: { id: currentState.id }
      })
    }
  }

  private async executeOperation(operation: TransactionOperation) {
    const { table, type, data, condition } = operation
    
    switch (type) {
      case 'insert':
        return await this.client.from(table).insert(data)
      case 'update':
        return await this.client.from(table).update(data).match(condition || {})
      case 'delete':
        return await this.client.from(table).delete().match(condition || {})
      default:
        throw new Error(`Unsupported operation type: ${type}`)
    }
  }

  private async rollback() {
    try {
      // Execute rollback operations in reverse order
      for (const operation of this.rollbackOperations.reverse()) {
        await this.executeOperation(operation)
      }
      await this.client.rpc('commit_transaction')
    } catch (error) {
      console.error('Rollback failed:', error)
      await this.client.rpc('rollback_transaction')
    }
  }
}
