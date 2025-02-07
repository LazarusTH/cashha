import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    if (!query) {
      return NextResponse.json({ recipients: [] })
    }

    // Search for recipients
    const { data: recipients, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .neq('id', user.id) // Exclude current user
      .eq('status', 'active') // Only active users
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return NextResponse.json({ recipients })
  } catch (error: any) {
    console.error('Recipients search error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to search recipients' 
    }), { status: 500 })
  }
})
