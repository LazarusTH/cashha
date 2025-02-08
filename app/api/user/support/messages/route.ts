import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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

    // Get pagination params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get messages with pagination
    const { data: messages, error: messagesError, count } = await supabase
      .from('support_messages')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Messages fetch error:', error)
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

    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('support_messages')
      .insert({
        user_id: session.user.id,
        content,
        type: 'user',
        status: 'sent'
      })
      .select()
      .single()

    if (messageError) {
      console.error('Message creation error:', messageError)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    // Generate auto-reply
    const autoReply = await generateAutoReply(content)

    // Save auto-reply
    const { data: autoReplyMessage, error: autoReplyError } = await supabase
      .from('support_messages')
      .insert({
        user_id: session.user.id,
        content: autoReply,
        type: 'system',
        status: 'sent',
        parent_id: message.id
      })
      .select()
      .single()

    if (autoReplyError) {
      console.error('Auto-reply creation error:', autoReplyError)
      return NextResponse.json(
        { error: 'Failed to create auto-reply' },
        { status: 500 }
      )
    }

    // Create support ticket if needed
    if (!isAutoReplyOnly(content)) {
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: session.user.id,
          title: content.substring(0, 100),
          status: 'open',
          priority: getPriority(content),
          first_message_id: message.id
        })

      if (ticketError) {
        console.error('Ticket creation error:', ticketError)
      }
    }

    return NextResponse.json({
      message,
      autoReply: autoReplyMessage
    })

  } catch (error) {
    console.error('Message send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
async function generateAutoReply(message: string): Promise<string> {
  // Simple auto-reply system - can be enhanced with AI/ML
  const keywords = message.toLowerCase()
  
  if (keywords.includes('password') || keywords.includes('login')) {
    return "For account security issues, please visit our Security Settings page. If you're still having trouble, a support agent will assist you shortly."
  }
  
  if (keywords.includes('deposit') || keywords.includes('payment')) {
    return "For questions about deposits or payments, please check our FAQ section. A support agent will review your message and get back to you soon."
  }
  
  if (keywords.includes('withdraw') || keywords.includes('transfer')) {
    return "For questions about withdrawals or transfers, please ensure you've reviewed our transaction limits. A support agent will assist you shortly."
  }
  
  return "Thank you for contacting support. We've received your message and a support agent will respond as soon as possible."
}

function getPriority(message: string): 'low' | 'medium' | 'high' {
  const keywords = message.toLowerCase()
  
  // High priority keywords
  if (
    keywords.includes('urgent') ||
    keywords.includes('emergency') ||
    keywords.includes('error') ||
    keywords.includes('failed') ||
    keywords.includes('locked')
  ) {
    return 'high'
  }
  
  // Medium priority keywords
  if (
    keywords.includes('problem') ||
    keywords.includes('issue') ||
    keywords.includes('help') ||
    keywords.includes('stuck')
  ) {
    return 'medium'
  }
  
  return 'low'
}

function isAutoReplyOnly(message: string): boolean {
  const keywords = message.toLowerCase()
  
  // Messages that can be handled by auto-reply only
  const autoReplyKeywords = [
    'hours',
    'contact',
    'address',
    'location',
    'faq',
    'guide',
    'tutorial'
  ]
  
  return autoReplyKeywords.some(keyword => keywords.includes(keyword))
}
