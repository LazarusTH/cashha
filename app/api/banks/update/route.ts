import { NextResponse } from 'next/server'
import { updateBank } from '@/lib/supabase/admin'
import { getSession } from '@/lib/supabase/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { id, name, status } = body

    if (!id || !name || !status) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const bank = await updateBank(id, { name, status })

    return NextResponse.json(bank)
  } catch (error) {
    console.error('[BANK_UPDATE]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
