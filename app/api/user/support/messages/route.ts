import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withUser } from '@/middleware/user'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withUser(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get chat messages
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select(`
        *,
        user:profiles!user_id(full_name, email),
        agent:profiles!agent_id(full_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error('Support messages fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch support messages' 
    }), { status: 500 })
  }
})

export const POST = withUser(async (req: Request) => {
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
        user_id: user.id,
        content,
        type: 'user'
      })
      .select(`
        *,
        user:profiles!user_id(full_name, email)
      `)
      .single()

    if (error) throw error

    // Create auto-reply
    const { error: autoReplyError } = await supabase
      .from('support_messages')
      .insert({
        user_id: user.id,
        content: getAutoReply(content),
        type: 'system'
      })

    if (autoReplyError) throw autoReplyError

    // Create notification for support team
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'support_message',
        title: 'New Support Message',
        content: `New message from ${user.email}`,
        role: 'support'
      })

    if (notificationError) throw notificationError

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Support message send error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to send message' 
    }), { status: 500 })
  }
})

function getAutoReply(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('deposit')) {
    return "To make a deposit, please go to the Deposit page and follow the instructions there. If you have any specific questions about deposits, feel free to ask."
  } 
  
  if (lowerMessage.includes('withdraw')) {
    return "For withdrawals, please visit the Withdraw page. Make sure you have sufficient balance and your account is verified. Let me know if you need more information."
  } 
  
  if (lowerMessage.includes('send')) {
    return "You can send money to other users from the Send Money page. You'll need the recipient's username or email address. Is there anything specific you'd like to know about sending money?"
  } 
  
  return "Thank you for your message. A support representative will get back to you shortly. Is there anything else I can help you with in the meantime?"
}
