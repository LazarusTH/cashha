import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function checkAdminRole(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    await checkAdminRole(supabase)

    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching banks:', error)
    if (error.message === 'Unauthorized') {
      return new NextResponse('Unauthorized', { status: 403 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    await checkAdminRole(supabase)
    const { name, status } = await request.json()

    const { error } = await supabase
      .from('banks')
      .insert([{ name, status }])

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating bank:', error)
    if (error.message === 'Unauthorized') {
      return new NextResponse('Unauthorized', { status: 403 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PUT(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    await checkAdminRole(supabase)
    const { id, name, status } = await request.json()

    const { error } = await supabase
      .from('banks')
      .update({ name, status })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating bank:', error)
    if (error.message === 'Unauthorized') {
      return new NextResponse('Unauthorized', { status: 403 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    await checkAdminRole(supabase)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return new NextResponse('Bank ID is required', { status: 400 })
    }

    const { error } = await supabase
      .from('banks')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bank:', error)
    if (error.message === 'Unauthorized') {
      return new NextResponse('Unauthorized', { status: 403 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
