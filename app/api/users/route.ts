import { NextResponse } from 'next/server'
import { getAllUsers } from '@/lib/supabase/admin'
import { adminAuthGuard } from '@/lib/auth'

export async function GET() {
  try {
    // Check if user is admin
    const isAdmin = await adminAuthGuard()
    if (!isAdmin) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const users = await getAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
