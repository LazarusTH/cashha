import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logAdminAction } from '@/lib/utils/audit-logger'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const withStats = searchParams.get('withStats') === 'true'

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        *,
        user_banks (
          id,
          bank:banks (
            id,
            name,
            code
          )
        ),
        wallet (
          id,
          balance,
          currency
        ),
        verification (
          status,
          verified_at,
          documents
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`
        full_name.ilike.%${search}%,
        email.ilike.%${search}%,
        phone.ilike.%${search}%
      `)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Get paginated results
    const { data: users, error: usersError, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (usersError) {
      console.error('Users fetch error:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get additional stats if requested
    if (withStats && users) {
      const userIds = users.map(user => user.id)
      const [transactionsResult, supportResult] = await Promise.all([
        // Get transaction stats
        supabase
          .from('transactions')
          .select('user_id, amount, type, status')
          .in('user_id', userIds),

        // Get support ticket stats
        supabase
          .from('support_tickets')
          .select('user_id, status')
          .in('user_id', userIds)
      ])

      // Calculate stats for each user
      const stats = userIds.reduce((acc: any, userId: string) => {
        const userTransactions = transactionsResult.data?.filter(tx => tx.user_id === userId) || []
        const userTickets = supportResult.data?.filter(ticket => ticket.user_id === userId) || []

        acc[userId] = {
          transaction_count: userTransactions.length,
          total_sent: userTransactions
            .filter(tx => tx.type === 'send' && tx.status === 'completed')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0),
          total_received: userTransactions
            .filter(tx => tx.type === 'receive' && tx.status === 'completed')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0),
          support_tickets: {
            total: userTickets.length,
            open: userTickets.filter(ticket => ticket.status === 'open').length
          }
        }
        return acc
      }, {})

      // Attach stats to users
      users.forEach(user => {
        user.stats = stats[user.id]
      })
    }

    return NextResponse.json({
      users,
      total: count || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export async function POST(request: Request) {
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

    const { email, password, full_name, role = 'user' } = await request.json()

    // Validate required fields
    if (!email?.trim() || !password?.trim() || !full_name?.trim()) {
      return NextResponse.json(
        { error: 'Email, password and full name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Create user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('User creation error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create profile
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        role,
        status: 'active',
        created_by: session.user.id
      })
      .eq('id', authData.user.id)
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Attempt to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Create wallet
    const { error: walletError } = await supabase
      .from('wallets')
      .insert({
        user_id: authData.user.id,
        balance: 0,
        currency: 'USD'
      })

    if (walletError) {
      console.error('Wallet creation error:', walletError)
      // Don't fail the request, but log the error
    }

    // Log activity
    await logAdminAction(
      supabase,
      session.user.id,
      authData.user.id,  // target is the created user
      'USER_CREATE',
      JSON.stringify({
        user_id: authData.user.id,
        email,
        role,
        timestamp: new Date().toISOString()
      }),
      request.headers
    )

    return NextResponse.json(newProfile)

  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
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

    const { id, updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate role if provided
    if (updates.role && !['user', 'admin'].includes(updates.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (updates.status && !['active', 'suspended', 'blocked'].includes(updates.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // Log activity
    await logAdminAction(
      supabase,
      session.user.id,
      id,  // target is the updated user
      'USER_UPDATE',
      JSON.stringify({
        user_id: id,
        changes: Object.keys(updates).join(', '),
        timestamp: new Date().toISOString()
      }),
      request.headers
    )

    return NextResponse.json(updatedProfile)

  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user has any transactions or active support tickets
    const [transactions, supportTickets] = await Promise.all([
      supabase
        .from('transactions')
        .select('id')
        .or(`sender_id.eq.${id},recipient_id.eq.${id}`),
      supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', id)
        .eq('status', 'open')
    ])

    if (transactions.data?.length || supportTickets.data?.length) {
      return NextResponse.json(
        { error: 'Cannot delete user with active transactions or support tickets' },
        { status: 400 }
      )
    }

    // Delete user auth record
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Auth deletion error:', authError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // Log activity
    await logAdminAction(
      supabase,
      session.user.id,
      id,  // target is the deleted user
      'USER_DELETE',
      JSON.stringify({
        user_id: id,
        timestamp: new Date().toISOString()
      }),
      request.headers
    )

    return NextResponse.json({
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
