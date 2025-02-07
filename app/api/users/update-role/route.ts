import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const { id, role } = await request.json()

    // Prevent changing own role
    if (id === user?.id) {
      return new NextResponse('Cannot change own role', { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user role:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
