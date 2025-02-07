import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const email = searchParams.get('email')

    if (!email) {
      return new NextResponse('Email parameter is required', { status: 400 })
    }

    // Search for recipient
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', `%${email}%`)
      .neq('id', user.id) // Exclude current user
      .limit(5)
      .single()

    if (!recipient) {
      return new NextResponse('Recipient not found', { status: 404 })
    }

    return NextResponse.json(recipient)
  } catch (error) {
    console.error('Error searching recipient:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
