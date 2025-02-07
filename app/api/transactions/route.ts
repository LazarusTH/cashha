import { NextResponse } from 'next/server'
import { getAllTransactions } from '@/lib/supabase/admin'
import { adminAuthGuard } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await adminAuthGuard()
    if (!isAdmin) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get query params for filters
    const { searchParams } = new URL(request.url)
    const filters = {
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      userId: searchParams.get('userId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }

    const transactions = await getAllTransactions(filters)
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
