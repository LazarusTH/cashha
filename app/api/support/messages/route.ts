import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())
    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create support message
    const { data: message, error: messageError } = await supabase
      .from('support_messages')
      .insert({
        user_id: session.user.id,
        content: content,
        sender: 'user'
      })
      .select()
      .single()

    if (messageError) {
      console.error('Support message error:', messageError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Create auto-reply message
    const { data: autoReply, error: replyError } = await supabase
      .from('support_messages')
      .insert({
        user_id: session.user.id,
        content: 'Thank you for your message. Our support team will get back to you shortly.',
        sender: 'support'
      })
      .select()
      .single()

    if (replyError) {
      console.error('Auto-reply error:', replyError)
    }

    // Create notification for support team
    await supabase
      .from('notifications')
      .insert({
        user_id: session.user.id,
        type: 'support_message',
        title: 'New Support Message',
        content: `New support message from ${session.user.email}`,
        metadata: {
          message_id: message.id
        }
      })

    return NextResponse.json({ 
      success: true,
      message,
      autoReply
    })

  } catch (error) {
    console.error('Support message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get all messages for the user
    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select()
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Support messages fetch error:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json(messages)

  } catch (error) {
    console.error('Support messages fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
