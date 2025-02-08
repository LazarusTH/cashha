import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const withStats = searchParams.get('withStats') === 'true'
    const status = searchParams.get('status')

    // Build query
    let query = supabase.from('banks').select(`
      *,
      user_banks (
        id,
        user:profiles (
          id,
          full_name,
          email
        )
      )
    `)

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Get banks
    const { data: banks, error: banksError } = await query
      .order('created_at', { ascending: false })

    if (banksError) {
      console.error('Banks fetch error:', banksError)
      return NextResponse.json(
        { error: 'Failed to fetch banks' },
        { status: 500 }
      )
    }

    // Get additional stats if requested
    if (withStats) {
      const bankIds = banks.map((bank: any) => bank.id)
      const [transactionsResult, withdrawalsResult, depositsResult] = await Promise.all([
        // Get transaction stats
        supabase
          .from('transactions')
          .select('bank_id, amount')
          .in('bank_id', bankIds),

        // Get withdrawal stats
        supabase
          .from('withdrawals')
          .select('bank_id, amount')
          .in('bank_id', bankIds),

        // Get deposit stats
        supabase
          .from('deposits')
          .select('bank_id, amount')
          .in('bank_id', bankIds)
      ])

      // Calculate stats for each bank
      const stats = bankIds.reduce((acc: any, bankId: string) => {
        const bankTransactions = transactionsResult.data?.filter((tx: any) => tx.bank_id === bankId) || []
        const bankWithdrawals = withdrawalsResult.data?.filter((w: any) => w.bank_id === bankId) || []
        const bankDeposits = depositsResult.data?.filter((d: any) => d.bank_id === bankId) || []

        acc[bankId] = {
          transaction_volume: bankTransactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0),
          withdrawal_volume: bankWithdrawals.reduce((sum: number, w: any) => sum + (w.amount || 0), 0),
          deposit_volume: bankDeposits.reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
          transaction_count: bankTransactions.length,
          withdrawal_count: bankWithdrawals.length,
          deposit_count: bankDeposits.length
        }
        return acc
      }, {})

      // Attach stats to banks
      banks.forEach((bank: any) => {
        bank.stats = stats[bank.id] || {
          transaction_volume: 0,
          withdrawal_volume: 0,
          deposit_volume: 0,
          transaction_count: 0,
          withdrawal_count: 0,
          deposit_count: 0
        }
      })
    }

    return NextResponse.json({ banks })

  } catch (error) {
    console.error('Banks fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const POST = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { name, code, logo_url, status = 'active' } = await req.json()

    // Validate required fields
    if (!name?.trim() || !code?.trim()) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    // Validate status
    if (!['active', 'inactive', 'maintenance'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('banks')
      .select('id')
      .eq('code', code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Bank code already exists' },
        { status: 400 }
      )
    }

    // Create bank
    const { data: bank, error: createError } = await supabase
      .from('banks')
      .insert({
        name,
        code,
        logo_url,
        status,
        created_by: session.user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Bank creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create bank' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      type: 'bank_create',
      metadata: {
        bank_id: bank.id,
        bank_name: name,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json(bank)

  } catch (error) {
    console.error('Bank creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const PUT = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id, name, logo_url, status } = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Bank ID is required' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'maintenance'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Build updates
    const updates: any = {
      updated_at: new Date().toISOString(),
      updated_by: session.user.id
    }

    if (name?.trim()) updates.name = name
    if (logo_url?.trim()) updates.logo_url = logo_url
    if (status) updates.status = status

    // Update bank
    const { data: bank, error: updateError } = await supabase
      .from('banks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Bank update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update bank' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      type: 'bank_update',
      metadata: {
        bank_id: id,
        changes: Object.keys(updates).filter(key => key !== 'updated_at' && key !== 'updated_by').join(', '),
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json(bank)

  } catch (error) {
    console.error('Bank update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Bank ID is required' },
        { status: 400 }
      )
    }

    // Check if bank has any associated records
    const [userBanks, transactions, withdrawals, deposits] = await Promise.all([
      supabase.from('user_banks').select('id').eq('bank_id', id),
      supabase.from('transactions').select('id').eq('bank_id', id),
      supabase.from('withdrawals').select('id').eq('bank_id', id),
      supabase.from('deposits').select('id').eq('bank_id', id)
    ])

    if (userBanks.data?.length || transactions.data?.length || 
        withdrawals.data?.length || deposits.data?.length) {
      return NextResponse.json(
        { error: 'Cannot delete bank with associated records' },
        { status: 400 }
      )
    }

    // Delete bank
    const { error: deleteError } = await supabase
      .from('banks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Bank deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete bank' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      type: 'bank_delete',
      metadata: {
        bank_id: id,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      message: 'Bank deleted successfully'
    })

  } catch (error) {
    console.error('Bank deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
