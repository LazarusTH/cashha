import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getTransactionStats, getTransactionMetrics } from '@/lib/supabase/admin'

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

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Get transaction stats and metrics
    const [stats, metrics] = await Promise.all([
      getTransactionStats(days),
      getTransactionMetrics()
    ])

    return NextResponse.json({
      stats,
      metrics,
      success: true
    })
  } catch (error) {
    console.error('Error getting transaction stats:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
