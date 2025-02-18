import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown', 10)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { email, password } = await req.json()
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new NextResponse(JSON.stringify({ error: 'User not found in profiles' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (profile.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    } else {
      return NextResponse.redirect(new URL('/user', req.url))
    }
  } catch (error: any) {
    console.error('Signin error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Invalid credentials' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
