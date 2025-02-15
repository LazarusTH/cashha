import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    // Get chat messages
    let query = supabase
      .from('support_messages')
      .select(`
        id,
        content,
        created_at,
        is_from_user,
        user:profiles!user_id(id, email, full_name),
        agent:support_agents!agent_id(id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query

    if (error) throw error

    return NextResponse.json({ messages: messages.reverse() })
  } catch (error: any) {
    console.error('Chat history error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch chat history' 
    }), { status: 500 })
  }
})

export const POST = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { content } = await req.json()

    // Create user message
    const { data: message, error: messageError } = await supabase
      .from('support_messages')
      .insert({
        user_id: user.id,
        content,
        is_from_user: true
      })
      .select()
      .single()

    if (messageError) throw messageError

    // Get auto-reply based on message content
    const autoReply = await getAutoReply(content)

    // Create auto-reply message
    const { data: replyMessage, error: replyError } = await supabase
      .from('support_messages')
      .insert({
        user_id: user.id,
        content: autoReply,
        is_from_user: false,
        is_auto_reply: true
      })
      .select()
      .single()

    if (replyError) throw replyError

    // Create support ticket if needed
    if (!isAutoReplyOnly(content)) {
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          status: 'pending',
          priority: getPriority(content),
          category: getCategory(content),
          last_message: content
        })

      if (ticketError) throw ticketError
    }

    return NextResponse.json({
      message,
      autoReply: replyMessage
    })
  } catch (error: any) {
    console.error('Message send error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to send message' 
    }), { status: 500 })
  }
})

// Helper functions for auto-reply system
async function getAutoReply(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('deposit')) {
    return 'To make a deposit, please go to the Deposit page and follow these steps:\n1. Enter the amount\n2. Choose your bank\n3. Upload proof of payment\n\nA support agent will verify your deposit shortly.'
  }
  
  if (lowerMessage.includes('withdraw')) {
    return 'For withdrawals, please ensure:\n1. You have sufficient balance\n2. Your account is verified\n3. You have added your bank details\n\nThen visit the Withdraw page to submit your request.'
  }
  
  if (lowerMessage.includes('verify') || lowerMessage.includes('verification')) {
    return 'To verify your account, please:\n1. Go to Settings > Verification\n2. Upload a valid ID\n3. Provide proof of address\n\nVerification usually takes 1-2 business days.'
  }
  
  return 'Thank you for your message. A support agent will assist you shortly. In the meantime, you can check our FAQ section for quick answers to common questions.'
}

function isAutoReplyOnly(message: string): boolean {
  const commonQueries = ['deposit', 'withdraw', 'verify', 'verification', 'how to', 'where', 'what is']
  return commonQueries.some(query => message.toLowerCase().includes(query))
}

function getPriority(message: string): 'low' | 'medium' | 'high' {
  const highPriorityKeywords = ['urgent', 'emergency', 'lost', 'stolen', 'fraud', 'hacked']
  const mediumPriorityKeywords = ['failed', 'error', 'issue', 'problem', 'not working']
  
  if (highPriorityKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
    return 'high'
  }
  if (mediumPriorityKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
    return 'medium'
  }
  return 'low'
}

function getCategory(message: string): string {
  const categories = {
    'account': ['login', 'password', 'verify', 'verification', 'profile'],
    'transaction': ['send', 'receive', 'transfer', 'payment'],
    'deposit': ['deposit', 'add money', 'fund'],
    'withdrawal': ['withdraw', 'withdrawal', 'cash out'],
    'technical': ['error', 'bug', 'issue', 'problem', 'not working'],
    'security': ['fraud', 'hack', 'stolen', 'suspicious']
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
      return category
    }
  }
  
  return 'general'
}
