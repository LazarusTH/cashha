import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createTransfer, getUserTransactions } from '@/lib/supabase/transactions'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { recipientEmail, amount, description } = await request.json()

    // Get recipient user
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', recipientEmail)
      .single()

    if (!recipient) {
      return new NextResponse('Recipient not found', { status: 404 })
    }

    // Create transfer
    const transfer = await createTransfer({
      userId: user.id,
      recipientId: recipient.id,
      amount,
      description
    })

    return NextResponse.json(transfer)
  } catch (error) {
    console.error('Error creating transfer:', error)
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
    console.error('Error fetching transfer history:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
