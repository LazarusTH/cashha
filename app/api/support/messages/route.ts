import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get chat history
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select(`
        id,
        sender_id,
        sender_type,
        content,
        read,
        created_at,
        sender:profiles!sender_id(full_name, email)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error('Support messages fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch messages' 
    }), { status: 500 })
  }
}

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { content } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Create message
    const { data: message, error } = await supabase
      .from('support_messages')
      .insert({
        sender_id: user.id,
        sender_type: 'user',
        content,
        read: false
      })
      .select(`
        id,
        sender_id,
        sender_type,
        content,
        read,
        created_at,
        sender:profiles!sender_id(full_name, email)
      `)
      .single()

    if (error) throw error

    // Auto-reply if outside business hours
    const now = new Date()
    const hour = now.getHours()
    const isBusinessHours = hour >= 9 && hour < 17
    
    if (!isBusinessHours) {
      const { error: autoReplyError } = await supabase
        .from('support_messages')
        .insert({
          sender_type: 'system',
          content: 'Thank you for your message. Our support team is available during business hours (9 AM - 5 PM). We will get back to you as soon as possible.',
          read: true,
          recipient_id: user.id
        })

      if (autoReplyError) throw autoReplyError
    }

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Support message send error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to send message' 
    }), { status: 500 })
  }
}
