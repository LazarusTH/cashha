import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createTransaction, getUserTransactions, getUserBalance } from '@/lib/supabase/transactions'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { amount, bankId } = await request.json()

    // Check balance
    const balance = await getUserBalance(user.id)
    if (balance < amount) {
      return new NextResponse('Insufficient balance', { status: 400 })
    }

    // Create withdrawal
    const withdrawal = await createTransaction({
      user_id: user.id,
      type: 'withdraw',
      amount,
      metadata: {
        account_number: bankId
      }
    })

    return NextResponse.json(withdrawal)
  } catch (error) {
    console.error('Error creating withdrawal:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const transactions = await getUserTransactions(user.id, limit)
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching withdrawal history:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
