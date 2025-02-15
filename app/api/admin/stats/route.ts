export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 403 })
    }

    // Get dashboard metrics
    const metrics = await getDashboardMetrics()

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error getting admin stats:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
