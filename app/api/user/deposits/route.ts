import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { AppError, ERROR_MESSAGES } from '@/lib/utils/error-handler'
import { validateAmount, validateDescription } from '@/lib/utils/validation'

// GET handler for fetching deposit history
export const GET = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: deposits, error } = await supabase
      .from('deposits')
      .select(`
        *,
        users (
          full_name,
          email
        )
      `)
      .eq('user_id', (req as any).user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json(deposits)
  } catch (error) {
    console.error('Error fetching deposits:', error)
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: 500 }
    )
  }
})

// POST handler for creating new deposits
export const POST = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()
    const { amount, paymentMethod, description } = body

    // Validate input
    const validAmount = validateAmount(amount)
    const validDescription = validateDescription(description)

    if (!paymentMethod) {
      throw new AppError(ERROR_MESSAGES.INVALID_PAYMENT_METHOD, 400)
    }

    // Check deposit limits
    const { data: limits } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', (req as any).user.id)
      .single()

    if (!limits) {
      throw new AppError('User limits not found', 404)
    }

    // Get today's deposits
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: dailyDeposits } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', (req as any).user.id)
      .gte('created_at', today.toISOString())
      .eq('status', 'approved')

    const dailyTotal = dailyDeposits?.reduce((sum, dep) => sum + dep.amount, 0) || 0

    if (dailyTotal + validAmount > limits.daily_deposit_limit) {
      throw new AppError(ERROR_MESSAGES.LIMIT_EXCEEDED, 400)
    }

    // Create the deposit
    const { data: deposit, error } = await supabase
      .from('deposits')
      .insert({
        user_id: (req as any).user.id,
        amount: validAmount,
        payment_method: paymentMethod,
        description: validDescription,
        status: 'pending',
        type: 'deposit'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(deposit)
  } catch (error) {
    console.error('Error creating deposit:', error)
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: 500 }
    )
  }
})
