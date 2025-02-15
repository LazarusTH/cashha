import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get search query
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Search for recipients
    const { data: recipients, error: searchError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', session.user.id) // Exclude current user
      .limit(10)

    if (searchError) {
      console.error('Recipient search error:', searchError)
      return NextResponse.json(
        { error: 'Failed to search recipients' },
        { status: 500 }
      )
    }

    // Get recent recipients
    const { data: recentRecipients } = await supabase
      .from('transactions')
      .select(`
        distinct recipient:profiles!recipient_id (
          id,
          email,
          full_name
        )
      `)
      .eq('sender_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get favorite recipients
    const { data: favoriteRecipients } = await supabase
      .from('favorite_recipients')
      .select(`
        recipient:profiles (
          id,
          email,
          full_name
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      search: recipients,
      recent: recentRecipients?.map(r => r.recipient) || [],
      favorites: favoriteRecipients?.map(f => f.recipient) || []
    })

  } catch (error) {
    console.error('Recipient search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { recipient_id } = await request.json()

    if (!recipient_id) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      )
    }

    // Check if recipient exists
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipient_id)
      .single()

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Add to favorites
    const { data: favorite, error: favoriteError } = await supabase
      .from('favorite_recipients')
      .upsert({
        user_id: session.user.id,
        recipient_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (favoriteError) {
      console.error('Add favorite error:', favoriteError)
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json(favorite)

  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const recipient_id = searchParams.get('id')

    if (!recipient_id) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      )
    }

    // Remove from favorites
    const { error: deleteError } = await supabase
      .from('favorite_recipients')
      .delete()
      .eq('user_id', session.user.id)
      .eq('recipient_id', recipient_id)

    if (deleteError) {
      console.error('Remove favorite error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
