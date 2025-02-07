import { NextResponse } from 'next/server'
import { getAllSupportRequests } from '@/lib/supabase/admin'
import { adminAuthGuard } from '@/lib/auth'

export async function GET() {
  try {
    // Check if user is admin
    const isAdmin = await adminAuthGuard()
    if (!isAdmin) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supportRequests = await getAllSupportRequests()
    return NextResponse.json(supportRequests)
  } catch (error) {
    console.error('Error fetching support requests:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
