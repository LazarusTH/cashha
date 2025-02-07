import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown', 10)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { email, password, full_name, phone } = await req.json()
    const supabase = createRouteHandlerClient({ cookies })

    // Create user in auth.users
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone
        }
      }
    })

    if (authError) throw authError

    // Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user?.id,
        email,
        full_name,
        phone,
        role: 'user'
      })

    if (profileError) throw profileError

    return NextResponse.json({
      message: 'Registration successful. Please check your email for verification.'
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to create account' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
