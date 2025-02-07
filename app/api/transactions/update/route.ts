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

    const { id, status, metadata } = await request.json()

    const { error } = await supabase
      .from('transactions')
      .update({ status, metadata })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
