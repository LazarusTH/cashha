import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getUserProfile, updateUserProfile } from '@/lib/supabase/profile'

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const profile = await getUserProfile(user.id)
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PUT(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const updates = await request.json()

    // Update profile
    const profile = await updateUserProfile(user.id, updates)
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
