import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'user' // user, bank, etc.

    if (!query) {
      return new NextResponse(JSON.stringify({ 
        error: 'Search query is required' 
      }), { status: 400 })
    }

    switch (type) {
      case 'user': {
        // Search for users by email or full name
        const { data: users, error } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            avatar_url,
            verification_status
          `)
          .neq('id', user.id) // Exclude current user
          .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
          .eq('is_active', true)
          .limit(5)

        if (error) throw error

        // Filter sensitive information
        const filteredUsers = users?.map(user => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          is_verified: user.verification_status === 'verified'
        }))

        return NextResponse.json({ results: filteredUsers })
      }

      case 'bank': {
        // Search for banks by name or swift code
        const { data: banks, error } = await supabase
          .from('banks')
          .select(`
            id,
            name,
            logo_url,
            swift_code
          `)
          .or(`name.ilike.%${query}%,swift_code.ilike.%${query}%`)
          .eq('is_active', true)
          .limit(5)

        if (error) throw error

        return NextResponse.json({ results: banks })
      }

      case 'transaction': {
        // Search user's transactions
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select(`
            id,
            type,
            amount,
            status,
            created_at,
            description,
            sender:profiles!sender_id(id, email, full_name),
            recipient:profiles!recipient_id(id, email, full_name)
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .or(`description.ilike.%${query}%,reference.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error

        return NextResponse.json({ results: transactions })
      }

      default:
        return new NextResponse(JSON.stringify({ 
          error: 'Invalid search type' 
        }), { status: 400 })
    }
  } catch (error: any) {
    console.error('Search error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Search failed' 
    }), { status: 500 })
  }
})
