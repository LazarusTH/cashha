import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createDeposit, getUserTransactions } from '@/lib/supabase/transactions'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { amount, fullName } = await request.json()

    // Create deposit
    const deposit = await createDeposit({
      userId: user.id,
      amount,
      metadata: { fullName }
    })

    return NextResponse.json(deposit)
  } catch (error) {
    console.error('Error creating deposit:', error)
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

    const transactions = await getUserTransactions(user.id, limit, 'deposit')
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching deposit history:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
