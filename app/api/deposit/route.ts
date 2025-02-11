import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { rateLimit } from '@/lib/utils/rate-limit'

const MAX_DEPOSIT_AMOUNT = 1000000 // $1M limit
const MIN_DEPOSIT_AMOUNT = 10 // $10 minimum

// Input validation schema
const depositSchema = z.object({
  amount: z.number()
    .min(MIN_DEPOSIT_AMOUNT, `Minimum deposit amount is $${MIN_DEPOSIT_AMOUNT}`)
    .max(MAX_DEPOSIT_AMOUNT, `Maximum deposit amount is $${MAX_DEPOSIT_AMOUNT}`),
  fullName: z.string()
    .min(2, 'Name is too short')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
    .transform(val => val.trim())
})

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request.headers.get('x-forwarded-for') || 'unknown', 10)
    if (rateLimitResponse) return rateLimitResponse

    const supabase = createClient(cookies())
    const body = await request.json()

    // Validate input
    const result = depositSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { amount, fullName } = result.data

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user status
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('status, deposit_limit')
      .eq('id', session.user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (userProfile.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      )
    }

    // Check if amount exceeds user's deposit limit
    if (userProfile.deposit_limit && amount > userProfile.deposit_limit) {
      return NextResponse.json(
        { error: `Amount exceeds your deposit limit of $${userProfile.deposit_limit}` },
        { status: 400 }
      )
    }

    // Start database transaction
    const { data: transaction, error: transactionError } = await supabase.rpc(
      'create_deposit_transaction',
      {
        p_user_id: session.user.id,
        p_amount: amount,
        p_depositor_name: fullName
      }
    )

    if (transactionError) {
      console.error('Deposit transaction error:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create deposit' },
        { status: 500 }
      )
    }

    // Send notification to admin
    await supabase.rpc('create_deposit_notification', {
      p_user_id: session.user.id,
      p_amount: amount,
      p_transaction_id: transaction.id
    })

    return NextResponse.json({ 
      success: true,
      transaction: transaction
    })

  } catch (error) {
    console.error('Deposit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get URL parameters with validation
    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '10')),
      100
    )
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const status = searchParams.get('status')
    
    // Build query
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('Error fetching deposits:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deposits' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transactions,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET deposits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
